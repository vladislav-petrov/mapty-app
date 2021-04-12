'use strict';

// PROJECT PLANNING

// 1. User stories
// 2. Features
// 3. Flowchart
// 4. Architecture
// DEVELOPMENT STEP

// SELECTING ELEMENTS

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// APPLICATION ARCHITECTURE

class App {
    _map;
    _mapZoomLevel = 10;
    _mapEvent;
    _workouts = [];

    constructor() {
        inputType.value = 'running';

        // Get user's position

        this._getPosition();

        // Get data from local storage

        this._getLocalStorage();

        // Attach event handlers

        inputType.addEventListener('change', this._toggleElevationField);
        form.addEventListener('submit', this._newWorkout.bind(this));
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
                alert('Could not get your position');
            });
        }
    }

    _loadMap(position) {
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        const coords = [latitude, longitude];

        this._map = L.map('map').setView(coords, this._mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
        .addTo(this._map);

        this._map.on('click', this._showForm.bind(this));

        this._workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });
    }

    _showForm(event) {
        form.classList.remove('hidden');
        inputDistance.focus();
        this._mapEvent = event;
    }

    _toggleElevationField() {
        inputCadence.closest('div').classList.toggle('form__row--hidden');
        inputElevation.closest('div').classList.toggle('form__row--hidden');
    }

    _newWorkout(event) {
        event.preventDefault();

        // Helper functions to validate inputs

        const allNumbers = (...inputs) => inputs.every(input => Number.isFinite(input) &&input !== 0);
        const allPositive = (...inputs) => inputs.every(input => input > 0);

        // Get data from form and check if data is valid

        const type = inputType.value;
        const distance = Number(inputDistance.value);
        const duration = Number(inputDuration.value);

        let workout;
        const {lat, lng} = this._mapEvent.latlng;

        if (type === 'running') {
            const cadence = Number(inputCadence.value);

            if (!allNumbers(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)) {
                    return alert('Data is incorrect!');
            }

            // If workout running, create running object

            workout = new Running([lat, lng], distance, duration, cadence);
        }

        if (type === 'cycling') {
            const elevationGain = Number(inputElevation.value);

            if (!allNumbers(distance, duration, elevationGain) ||
                !allPositive(distance, duration)) {
                    return alert('Data is incorrect!');
            }

            // If workout cycling, create cycling object

            workout = new Cycling([lat, lng], distance, duration, elevationGain);
        }

        // Add new object to workout array

        this._workouts.push(workout);

        // Render workout on map as marker

        this._renderWorkoutMarker(workout);

        // Render workout on list

        this._renderWorkout(workout);

        // Hide form + clear input fields

        this._hideForm();

        // Set local storage to all workouts

        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coordinates)
        .addTo(this._map)
        .bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`
        }))
        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
        .openPopup();
    }

    _renderWorkout(workout) {
        const html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.type === 'running' ? workout.pace.toFixed(1) : workout.speed.toFixed(1)}</span>
            <span class="workout__unit">${workout.type === 'running' ? 'min/km' : 'km/h'}</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🦶🏼' : '⛰'}</span>
            <span class="workout__value">${workout.type === 'running' ? workout.cadence : workout.elevationGain}</span>
            <span class="workout__unit">${workout.type === 'running' ? 'spm' : 'm'}</span>
          </div>
        </li>
        `;

        form.insertAdjacentHTML('afterend', html);
    }

    _hideForm() {
        inputDistance.value = '';
        inputDuration.value = '';
        inputCadence.value = '';
        inputElevation.value = '';

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _moveToPopup(event) {
        const workoutElement = event.target.closest('.workout');
        
        if (!workoutElement) return;

        const workout = this._workouts.find(workout => workout.id === workoutElement.dataset.id);

        this._map.setView(workout.coordinates, this._mapZoomLevel, {
            animate: true,
            pan: {
                duration: 0.5
            }
        });

        // Using the public interface
        // workout.click();
        // console.log(workout.clicks);
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this._workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        this._workouts = data;

        this._workouts.forEach(work => {
            this._renderWorkout(work);
        });
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}

class Workout {
    date = new Date();
    id = String(Date.now()).slice(-10);
    description;
    clicks = 0;

    constructor(coordinates, distance, duration) {
        this.coordinates = coordinates;      // [lat, lng]
        this.distance = distance;            // in km
        this.duration = duration;            // in min
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type.slice(0, 1).toUpperCase() + this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(coordinates, distance, duration, cadence) {
        super(coordinates, distance, duration);
        this.cadence = cadence;              // in step/min
        this._calcPace();
        this._setDescription();
    }

    _calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coordinates, distance, duration, elevationGain) {
        super(coordinates, distance, duration);
        this.elevationGain = elevationGain;  // in m
        this._calcSpeed();
        this._setDescription();
    }

    _calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

const app = new App();
