'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date()
  id = (Date.now() + "").slice(-10)
  clicks = 0

  constructor(coords, distance, durations) {
    this.coords = coords // [ LAT, LNG ]
    this.distance = distance // iIN KM
    this.durations = durations // IN MIN

  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]
      } ${this.date.getDate()}`
  }

  click() {
    this.clicks++
  }
}

class Running extends Workout {
  type = "running"
  constructor(coords, distance, durations, cadence) {
    super(coords, distance, durations)
    this.cadence = cadence
    this.calcPace()
    this._setDescription()
  }

  calcPace() {
    // MIN/KM
    this.pace = this.durations / this.distance
    return this.pace
  }
}

class Cycling extends Workout {
  type = "cycling"
  constructor(coords, distance, durations, elevationGain) {
    super(coords, distance, durations)
    this.elevationGain = elevationGain
    this.calcSpeed()
    this._setDescription()
  }

  calcSpeed() {
    // KM/H
    this.speed = this.distance / (this.durations / 60)
    return this.speed
  }
}

//////////////////////////////////////////////////////
// APPLICATON ARCHITECTURE
class App {
  #map
  #mapZoomLevel = 12
  #mapEvent
  #workouts = []

  constructor() {
    // GETING USER'S POSITION
    this._getPosition()

    // GETING DATA FROM LOCAL STORAGE
    this._getLocalStorage()

    // ATTACHING EVENT HANDLERS
    form.addEventListener("submit", this._newWorkout.bind(this))
    inputType.addEventListener("change", this._toggleElevationField
    )
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this))
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
        function () {
          alert('Could not get your location');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel)
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // HANDLING CLICK ON MAP
    this.#map.on('click', this._showForm.bind(this)
    );

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE
    form.classList.remove("hidden")
    inputDistance.focus()
  }

  _hideForm() {
    // EMPTY INPUTS
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ""
    form.style.display = "none"
    form.classList.add("hidden")
    setTimeout(() => (form.style.display = "grid"), 1000)
  }

  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden")
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden")
  }

  _newWorkout(e) {
    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp))

    const allPositive = (...inputs) => inputs.every(inp => inp > 0)

    e.preventDefault()

    // GETTING DATA FROM FORM
    const type = inputType.value
    const distance = +inputDistance.value
    const duration = +inputDuration.value
    const { lat, lng } = this.#mapEvent.latlng;
    let workout

    // IF WORKOUT IS RUNNING, CREATE A RUNNING OBJECT
    if (type === "running") {
      const cadence = +inputCadence.value
      // CHECKING IF DATA IS VALID
      if (
        !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)
      )
        return alert("Input have to be positive number!")

      workout = new Running([lat, lng], distance, duration, cadence)
    }

    // IF WORKOUT IS CYCLING, CREATE A CYCLING OBJECT
    if (type === "cycling") {
      const elevation = +inputElevation.value
      // CHECKING IF DATA IS VALID
      if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)
      )
        return alert("Input have to be positive number!")

      workout = new Cycling([lat, lng], distance, duration, elevation)
    }

    // ADDING NEW OBJECT TO WORKOUT ARRAY
    this.#workouts.push(workout)

    // RENDERING WORKOUT ON MAP AS MARKER
    this._renderWorkoutMarker(workout)


    // RANDERING WORKOUT ON LIST
    this._renderWorkout(workout)

    // HIDEING THE FORM AND CLEARING INPUT FIELDS
    this._hideForm()

    // SET LOCAL STORAGE TO ALL WORKOUTS
    this._setLocalStorage()
  }


  _renderWorkoutMarker(workout) {
    // DISPLAY MARKER
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 254,
          minWidth: 197,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`
        })
      )
      .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
      .openPopup();
  }

  _renderWorkout(workout) {

    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
  `;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>
    `;

    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>
    `

    form.insertAdjacentHTML("afterend", html)
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout")

    if (!workoutEl) return

    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      }
    })

    // workout.clicks()
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts))
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem("workouts")
    location.reload()
  }
}

const app = new App()

