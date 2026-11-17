import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:5000/api`;

  
const airports = [
  { city: "Delhi", code: "DEL" },
  { city: "Bengaluru", code: "BLR" },
  { city: "Hyderabad", code: "HYD" },
  { city: "Chennai", code: "MAA" },
  { city: "Vijayawada", code: "VGA" },
  { city: "Mumbai", code: "BOM" },
  { city: "Goa", code: "GOI" },
  { city: "Kolkata", code: "CCU" },
  { city: "Pune", code: "PNQ" },
  { city: "Kochi", code: "COK" },
];

const getToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const createPassenger = (index, user = null) => ({
  name: "",
  age: "",
  gender: "",
  email: index === 0 ? user?.email || "" : "",
  phone: index === 0 ? "" : "",
});

const makePassengerList = (count, existing = [], user = null) =>
  Array.from({ length: count }, (_, index) =>
    existing[index] || createPassenger(index, user)
  );

function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("letsGoUser");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [from, setFrom] = useState("Delhi");
  const [to, setTo] = useState("Bengaluru");
  const [departureDate, setDepartureDate] = useState(getToday());
  const [passengers, setPassengers] = useState(1);

  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [showPassengers, setShowPassengers] = useState(false);

  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [pendingSearch, setPendingSearch] = useState(false);

  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [passengerDetails, setPassengerDetails] = useState(
    makePassengerList(1, [], user)
  );
  const [booking, setBooking] = useState(null);
  const [resetToken, setResetToken] = useState("");

  const today = getToday();

  useEffect(() => {
    const match = window.location.pathname.match(/^\/reset-password\/([^/]+)/);
    if (match) {
      setResetToken(match[1]);
      setPage("reset");
    }
  }, []);

  useEffect(() => {
    setPassengerDetails((current) =>
      makePassengerList(passengers, current, user)
    );
  }, [passengers, user]);

  useEffect(() => {
    if (selectedSeats.length > passengers) {
      setSelectedSeats((current) => current.slice(0, passengers));
    }
  }, [passengers, selectedSeats.length]);

  const saveUser = (loggedUser) => {
    setUser(loggedUser);
    localStorage.setItem("letsGoUser", JSON.stringify(loggedUser));
  };

  const handleLogout = () => {
    localStorage.removeItem("letsGoUser");
    setUser(null);
    setPendingSearch(false);
    setPage("home");
  };

  const swapCities = () => {
    const oldFrom = from;
    setFrom(to);
    setTo(oldFrom);
    setSearchError("");
  };

  const runFlightSearch = async () => {
    setSearchError("");
    setLoading(true);

    try {
      const response = await axios.get(`${API}/flights/search`, {
        params: {
          from,
          to,
          date: departureDate,
          passengers,
        },
      });

      setFlights(response.data.flights || []);
      setPage("flights");
    } catch (error) {
      console.error(error);
      setSearchError(
        error.response?.data?.message ||
          "Unable to search flights. Please try again."
      );
      setPage("home");
    } finally {
      setLoading(false);
    }
  };

  const searchFlights = async () => {
    setSearchError("");

    if (!user) {
      setPendingSearch(true);
      setPage("authPrompt");
      return;
    }

    if (!from || !to) {
      setSearchError("Please select both departure and destination.");
      return;
    }

    if (from === to) {
      setSearchError("Departure and destination cannot be the same.");
      return;
    }

    if (!departureDate || departureDate < today) {
      setSearchError("Please select today or a future departure date.");
      return;
    }

    await runFlightSearch();
  };

  const finishLogin = async (loggedUser) => {
    saveUser(loggedUser);

    if (pendingSearch) {
      setPendingSearch(false);
      await runFlightSearch();
    } else {
      setPage("home");
    }
  };

  const chooseFlight = (flight) => {
    if (!user) {
      setPendingSearch(false);
      setPage("authPrompt");
      return;
    }

    setSelectedFlight({
      ...flight,
      searchData: {
        from,
        to,
        departureDate,
        passengers,
      },
    });
    setSelectedSeats([]);
    setPassengerDetails(makePassengerList(passengers, [], user));
    setPage("passenger");
  };

  const updatePassenger = (index, field, value) => {
    setPassengerDetails((current) =>
      current.map((passenger, passengerIndex) =>
        passengerIndex === index
          ? { ...passenger, [field]: value }
          : passenger
      )
    );
  };

  const continuePassenger = () => {
    if (!user) {
      setPage("authPrompt");
      return;
    }

    for (let index = 0; index < passengerDetails.length; index += 1) {
      const passenger = passengerDetails[index];

      if (
        !passenger.name.trim() ||
        !passenger.age ||
        !passenger.gender ||
        !passenger.email.trim() ||
        !passenger.phone.trim()
      ) {
        alert(`Please complete all details for Passenger ${index + 1}.`);
        return;
      }

      if (!/^\S+@\S+\.\S+$/.test(passenger.email)) {
        alert(`Please enter a valid email for Passenger ${index + 1}.`);
        return;
      }

      const age = Number(passenger.age);
      if (!Number.isInteger(age) || age < 1 || age > 120) {
        alert(`Please enter a valid age between 1 and 120 for Passenger ${index + 1}.`);
        return;
      }

      if (!/^\d{10}$/.test(passenger.phone.replace(/\D/g, ""))) {
        alert(`Please enter a valid 10-digit phone number for Passenger ${index + 1}.`);
        return;
      }
    }

    setPage("seat");
  };

  const toggleSeat = (seat) => {
    if (selectedSeats.includes(seat)) {
      setSelectedSeats((current) => current.filter((item) => item !== seat));
      return;
    }

    if (selectedSeats.length >= passengers) return;

    setSelectedSeats((current) => [...current, seat]);
  };

  const continueSeat = () => {
    if (!user) {
      setPage("authPrompt");
      return;
    }

    if (selectedSeats.length !== passengers) {
      alert(`Please select exactly ${passengers} seat(s).`);
      return;
    }

    setPage("payment");
  };

  const completeBooking = () => {
    if (!user) {
      setPage("authPrompt");
      return;
    }

    const total = Number(selectedFlight?.price || 0) * passengers;

    const bookingData = {
      bookingId: `LG${Date.now().toString().slice(-8)}`,
      passengers: passengerDetails,
      flight: selectedFlight,
      seats: selectedSeats,
      passengerCount: passengers,
      total,
      date: new Date().toLocaleDateString("en-IN"),
    };

    setBooking(bookingData);
    setPage("confirmed");
  };

  return (
    <div className="app">
      <header className="navbar">
        <div className="logo" onClick={() => setPage("home")}>
          <span className="logo-plane">✈</span>
          <span>LET'S GO</span>
        </div>

        <nav>
          <button onClick={() => setPage("home")}>Explore</button>
          <button
            onClick={() => {
              setPage("home");
              setTimeout(() => window.scrollTo({ top: 700, behavior: "smooth" }), 50);
            }}
          >
            Destinations
          </button>
        </nav>

        <div className="nav-right">
          {user ? (
            <>
              <span className="welcome">Hi, {user.name}</span>
              <button className="logout-btn" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <button className="login-btn" onClick={() => setPage("login")}>
                Log in
              </button>
              <button className="login-btn" onClick={() => setPage("signup")}>
                Sign up
              </button>
            </>
          )}
        </div>
      </header>

      {page === "home" && (
        <HomePage
          from={from}
          to={to}
          setFrom={setFrom}
          setTo={setTo}
          departureDate={departureDate}
          setDepartureDate={setDepartureDate}
          passengers={passengers}
          setPassengers={setPassengers}
          showFrom={showFrom}
          setShowFrom={setShowFrom}
          showTo={showTo}
          setShowTo={setShowTo}
          showPassengers={showPassengers}
          setShowPassengers={setShowPassengers}
          swapCities={swapCities}
          searchFlights={searchFlights}
          loading={loading}
          searchError={searchError}
          today={today}
        />
      )}

      {page === "flights" && (
        <FlightResults
          flights={flights}
          from={from}
          to={to}
          departureDate={departureDate}
          passengers={passengers}
          onBack={() => setPage("home")}
          onChoose={chooseFlight}
        />
      )}

      {page === "passenger" && (
        <PassengerPage
          details={passengerDetails}
          updatePassenger={updatePassenger}
          onBack={() => setPage("flights")}
          onContinue={continuePassenger}
          flight={selectedFlight}
          passengers={passengers}
        />
      )}

      {page === "seat" && (
        <SeatPage
          passengers={passengers}
          selectedSeats={selectedSeats}
          toggleSeat={toggleSeat}
          onBack={() => setPage("passenger")}
          onContinue={continueSeat}
          flight={selectedFlight}
        />
      )}

      {page === "payment" && (
        <PaymentPage
          flight={selectedFlight}
          passengers={passengers}
          seats={selectedSeats}
          onBack={() => setPage("seat")}
          onComplete={completeBooking}
        />
      )}

      {page === "confirmed" && (
        <TicketPage booking={booking} onHome={() => setPage("home")} />
      )}

      {page === "authPrompt" && (
        <AuthPromptPage
          onLogin={() => setPage("login")}
          onSignup={() => setPage("signup")}
          onBack={() => setPage("home")}
        />
      )}

      {page === "login" && (
        <LoginPage
          onLogin={finishLogin}
          onSignup={() => setPage("signup")}
          onForgot={() => setPage("forgot")}
          onBack={() => setPage("home")}
        />
      )}

      {page === "signup" && (
        <SignupPage
          onLogin={() => setPage("login")}
          onBack={() => setPage("home")}
          onSignedUp={() => setPage("login")}
        />
      )}

      {page === "forgot" && (
        <ForgotPasswordPage
          onBack={() => setPage("login")}
        />
      )}

      {page === "reset" && (
        <ResetPasswordPage
          token={resetToken}
          onDone={() => {
            window.history.replaceState({}, "", "/");
            setPage("login");
          }}
        />
      )}
    </div>
  );
}

function HomePage({
  from,
  to,
  setFrom,
  setTo,
  departureDate,
  setDepartureDate,
  passengers,
  setPassengers,
  showFrom,
  setShowFrom,
  showTo,
  setShowTo,
  showPassengers,
  setShowPassengers,
  swapCities,
  searchFlights,
  loading,
  searchError,
  today,
}) {
  const fromAirport = airports.find((airport) => airport.city === from);
  const toAirport = airports.find((airport) => airport.city === to);

  return (
    <main className="home">
      <section className="hero">
        <div className="hero-decoration circle-one"></div>
        <div className="hero-decoration circle-two"></div>

        <div className="hero-content">
          <div className="hero-badge">✈ SMARTER WAY TO FLY</div>
          <h1>
            Where are you
            <br />
            <span>flying next?</span>
          </h1>
          <p>
            Find the best flights for your journey.
            <br />
            Simple booking. Better journeys.
          </p>
        </div>

        <div className="booking-card">
          <div className="trip-tabs">
            <button className="trip-tab active">One way</button>
            <button className="trip-tab" onClick={() => alert("Round trip booking is coming next.")}>Round trip</button>
            <button className="trip-tab" onClick={() => alert("Multi-city booking is coming next.")}>Multi-city</button>
          </div>

          <div className="route-row">
            <div className="location-wrapper">
              <label>FROM</label>
              <button
                className="location-field"
                onClick={() => {
                  setShowFrom(!showFrom);
                  setShowTo(false);
                }}
              >
                <span className="location-icon">⌖</span>
                <span className="location-info">
                  <strong>{from}</strong>
                  <small>{fromAirport?.code}</small>
                </span>
                <span className="field-arrow">⌄</span>
              </button>
              {showFrom && (
                <AirportDropdown
                  selected={from}
                  onSelect={(city) => {
                    setFrom(city);
                    setShowFrom(false);
                  }}
                />
              )}
            </div>

            <button className="swap-button" onClick={swapCities} title="Swap cities">⇄</button>

            <div className="location-wrapper">
              <label>TO</label>
              <button
                className="location-field"
                onClick={() => {
                  setShowTo(!showTo);
                  setShowFrom(false);
                }}
              >
                <span className="location-icon">⌖</span>
                <span className="location-info">
                  <strong>{to}</strong>
                  <small>{toAirport?.code}</small>
                </span>
                <span className="field-arrow">⌄</span>
              </button>
              {showTo && (
                <AirportDropdown
                  selected={to}
                  onSelect={(city) => {
                    setTo(city);
                    setShowTo(false);
                  }}
                />
              )}
            </div>
          </div>

          <div className="booking-bottom">
            <div className="date-field">
              <label>DEPARTURE</label>
              <div className="date-input-wrapper">
                <span>📅</span>
                <input
                  type="date"
                  min={today}
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                />
              </div>
            </div>

            <div className="passenger-wrapper">
              <label>PASSENGERS</label>
              <button
                className="passenger-field"
                onClick={() => setShowPassengers(!showPassengers)}
              >
                <span>👤</span>
                <strong>
                  {passengers} {passengers === 1 ? "Passenger" : "Passengers"}
                </strong>
                <span>⌄</span>
              </button>

              {showPassengers && (
                <div className="passenger-dropdown">
                  {[1, 2, 3, 4, 5, 6].map((number) => (
                    <button
                      key={number}
                      className={passengers === number ? "passenger-option selected" : "passenger-option"}
                      onClick={() => {
                        setPassengers(number);
                        setShowPassengers(false);
                      }}
                    >
                      <span>{number}</span>
                      {number === 1 ? "Passenger" : "Passengers"}
                      {passengers === number && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {searchError && <div className="search-error">⚠ {searchError}</div>}

          <button className="search-button" onClick={searchFlights} disabled={loading}>
            {loading ? (
              <><span className="spinner"></span> Searching...</>
            ) : (
              <>🔎 Search Flights <span>→</span></>
            )}
          </button>
        </div>
      </section>

      <section className="popular-section">
        <div className="section-heading">
          <div>
            <span>EXPLORE</span>
            <h2>Popular destinations</h2>
          </div>
          <p>Discover beautiful places and start your next adventure.</p>
        </div>

        <div className="destination-grid">
          <DestinationCard city="Hyderabad" code="HYD" price="₹2,499" image="🌆" onClick={() => setTo("Hyderabad")} />
          <DestinationCard city="Mumbai" code="BOM" price="₹2,799" image="🌃" onClick={() => setTo("Mumbai")} />
          <DestinationCard city="Goa" code="GOI" price="₹2,299" image="🏖️" onClick={() => setTo("Goa")} />
        </div>
      </section>

      <section className="journey-banner">
        <div>
          <span>YOUR JOURNEY, YOUR WAY</span>
          <h2>Ready for takeoff?</h2>
        </div>
        <div className="big-plane">✈</div>
      </section>
    </main>
  );
}

function AirportDropdown({ selected, onSelect }) {
  return (
    <div className="airport-dropdown">
      {airports.map((airport) => (
        <button
          key={airport.code}
          className={selected === airport.city ? "airport-option selected" : "airport-option"}
          onClick={() => onSelect(airport.city)}
        >
          <span className="airport-symbol">✈</span>
          <span>
            <strong>{airport.city}</strong>
            <small>{airport.code}</small>
          </span>
          {selected === airport.city && <span className="check">✓</span>}
        </button>
      ))}
    </div>
  );
}

function DestinationCard({ city, code, price, image, onClick }) {
  return (
    <button className="destination-card" onClick={onClick}>
      <div className="destination-image">
        <span>{image}</span>
        <div className="destination-overlay">
          <small>FROM</small>
          <strong>{price}</strong>
        </div>
      </div>
      <div className="destination-info">
        <div>
          <h3>{city}</h3>
          <span>{code}</span>
        </div>
        <span className="destination-arrow">→</span>
      </div>
    </button>
  );
}

function FlightResults({ flights, from, to, departureDate, passengers, onBack, onChoose }) {
  return (
    <main className="page-container">
      <button className="back-button" onClick={onBack}>← Modify search</button>
      <div className="results-header">
        <div>
          <span className="eyebrow">FLIGHT RESULTS</span>
          <h1>{from} <span>→</span> {to}</h1>
          <p>{departureDate} · {passengers} {passengers === 1 ? "passenger" : "passengers"}</p>
        </div>
        <div className="results-count">{flights.length} flights</div>
      </div>

      {flights.length === 0 ? (
        <div className="empty-results">
          <div>✈</div>
          <h2>No flights found</h2>
          <p>Try another route or choose a different date.</p>
          <button className="primary-button" onClick={onBack}>Change Search</button>
        </div>
      ) : (
        <div className="flight-results">
          {flights.map((flight, index) => (
            <div className="flight-card" key={flight.id || index}>
              <div className="airline-info">
                <div className="airline-logo">✈</div>
                <div>
                  <strong>{flight.airline}</strong>
                  <small>{flight.flightNumber}</small>
                </div>
              </div>

              <div className="flight-times">
                <div><strong>{flight.departure}</strong><span>{flight.from}</span></div>
                <div className="flight-line"><small>{flight.duration}</small><span>────────✈</span></div>
                <div><strong>{flight.arrival}</strong><span>{flight.to}</span></div>
              </div>

              <div className="flight-price">
                <small>PER PASSENGER</small>
                <strong>₹{Number(flight.price).toLocaleString("en-IN")}</strong>
                <button onClick={() => onChoose(flight)}>Select →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function PassengerPage({ details, updatePassenger, onBack, onContinue, flight, passengers }) {
  return (
    <main className="page-container narrow">
      <button className="back-button" onClick={onBack}>← Back to flights</button>

      <div className="step-header">
        <span className="eyebrow">STEP 1 OF 3</span>
        <h1>Passenger details</h1>
        <p>Enter the details for all {passengers} {passengers === 1 ? "passenger" : "passengers"} travelling with Let's Go.</p>
      </div>

      <div className="checkout-grid">
        <div className="form-card">
          <h2>Passenger information</h2>
          <p className="form-note">All passenger details are required for this demo booking.</p>

          {details.map((passenger, index) => (
            <div className="passenger-block" key={index}>
              <div className="passenger-block-title">
                <h3>Passenger {index + 1}</h3>
                {index === 0 && <span>PRIMARY PASSENGER</span>}
              </div>

              <label>FULL NAME</label>
              <input value={passenger.name} onChange={(e) => updatePassenger(index, "name", e.target.value)} placeholder="Enter full name" />

              <div className="input-row">
                <div>
                  <label>AGE</label>
                  <input type="number" min="1" max="120" value={passenger.age} onChange={(e) => updatePassenger(index, "age", e.target.value)} placeholder="Age" />
                </div>
                <div>
                  <label>GENDER</label>
                  <select value={passenger.gender} onChange={(e) => updatePassenger(index, "gender", e.target.value)}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <label>EMAIL ADDRESS</label>
              <input type="email" value={passenger.email} onChange={(e) => updatePassenger(index, "email", e.target.value)} placeholder="Enter email address" />

              <label>PHONE NUMBER</label>
              <input
                inputMode="numeric"
                maxLength={10}
                value={passenger.phone}
                onChange={(e) => updatePassenger(index, "phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit phone number"
              />
            </div>
          ))}

          <button className="primary-button full" onClick={onContinue}>Continue to seat selection →</button>
        </div>

        <SummaryCard flight={flight} passengers={passengers} />
      </div>
    </main>
  );
}

function SeatPage({ passengers, selectedSeats, toggleSeat, onBack, onContinue, flight }) {
  const bookedSeats = ["1A", "1B", "2C", "3D", "4A", "5F", "6B"];
  const rows = [1, 2, 3, 4, 5, 6, 7, 8];
  const seatLetters = ["A", "B", "C", "D", "E", "F"];

  return (
    <main className="page-container">
      <button className="back-button" onClick={onBack}>← Passenger details</button>
      <div className="step-header center">
        <span className="eyebrow">STEP 2 OF 3</span>
        <h1>Choose your seats</h1>
        <p>Select exactly {passengers} {passengers === 1 ? "seat" : "seats"} for your journey.</p>
        <div className="seat-progress"><strong>{selectedSeats.length}</strong> / {passengers} seats selected</div>
      </div>

      <div className="seat-layout">
        <div className="aircraft">
          <div className="cockpit">✈</div>
          <div className="seat-grid">
            {rows.map((row) => (
              <div className="seat-row" key={row}>
                <span className="row-number">{row}</span>
                {seatLetters.map((letter) => {
                  const seat = `${row}${letter}`;
                  const booked = bookedSeats.includes(seat);
                  const selected = selectedSeats.includes(seat);
                  return (
                    <button
                      key={seat}
                      disabled={booked}
                      onClick={() => toggleSeat(seat)}
                      className={`seat ${booked ? "booked" : ""} ${selected ? "selected" : ""}`}
                    >
                      {selected ? "✓" : seat}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="seat-legend">
            <span><i className="available"></i>Available</span>
            <span><i className="selected-seat"></i>Selected</span>
            <span><i className="booked-seat"></i>Occupied</span>
          </div>
        </div>

        <div className="seat-summary">
          <h2>Your seats</h2>
          <div className="selected-seat-list">
            {selectedSeats.length === 0 ? <p>No seats selected</p> : selectedSeats.map((seat) => <span key={seat}>{seat}</span>)}
          </div>
          <SummaryCard flight={flight} passengers={passengers} seats={selectedSeats} />
          <button className="primary-button full" disabled={selectedSeats.length !== passengers} onClick={onContinue}>Continue to payment →</button>
        </div>
      </div>
    </main>
  );
}

function PaymentPage({ flight, passengers, seats, onBack, onComplete }) {
  const total = Number(flight?.price || 0) * passengers;
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [error, setError] = useState("");

  const handleCardNumber = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, "$1 ").trim();
    setCardNumber(formatted);
  };

  const handleExpiry = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  };

  const validatePayment = () => {
    const cleanCard = cardNumber.replace(/\s/g, "");

    if (!cardName.trim()) return "Please enter the cardholder name.";
    if (!/^\d{16}$/.test(cleanCard)) return "Card number must contain exactly 16 digits.";
    if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(expiry)) return "Expiry must be in MM/YYYY format.";

    const [monthString, yearString] = expiry.split("/");
    const month = Number(monthString);
    const year = Number(yearString);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (month < 1 || month > 12) return "Expiry month must be between 01 and 12.";
    if (year < currentYear || (year === currentYear && month < currentMonth)) return "The card has expired.";
    if (!/^\d{3}$/.test(cvv)) return "CVV must contain exactly 3 digits.";

    return "";
  };

  const pay = () => {
    const validationError = validatePayment();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    onComplete();
  };

  return (
    <main className="page-container narrow">
      <button className="back-button" onClick={onBack}>← Seat selection</button>
      <div className="step-header">
        <span className="eyebrow">STEP 3 OF 3</span>
        <h1>Complete your booking</h1>
        <p>This is a demo payment. No real money will be charged.</p>
      </div>

      <div className="checkout-grid">
        <div className="form-card">
          <h2>Demo payment</h2>
          <p className="payment-demo-note">Use any 16-digit demo card number. No real card is processed.</p>

          <label>CARDHOLDER NAME</label>
          <input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Name on card" />

          <label>CARD NUMBER</label>
          <input
            inputMode="numeric"
            maxLength={19}
            value={cardNumber}
            onChange={(e) => handleCardNumber(e.target.value)}
            placeholder="1234 5678 9012 3456"
          />
          <small className="input-hint">16 digits required</small>

          <div className="input-row">
            <div>
              <label>EXPIRY</label>
              <input inputMode="numeric" maxLength={7} value={expiry} onChange={(e) => handleExpiry(e.target.value)} placeholder="MM/YYYY" />
            </div>
            <div>
              <label>CVV</label>
              <input inputMode="numeric" type="password" maxLength={3} value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="123" />
            </div>
          </div>

          {error && <div className="search-error">⚠ {error}</div>}

          <button className="primary-button full" onClick={pay}>Pay ₹{total.toLocaleString("en-IN")} →</button>
        </div>

        <SummaryCard flight={flight} passengers={passengers} seats={seats} total={total} />
      </div>
    </main>
  );
}

function SummaryCard({ flight, passengers, seats = [], total }) {
  if (!flight) return null;
  const calculatedTotal = total ?? Number(flight.price || 0) * passengers;
  return (
    <div className="summary-card">
      <span className="eyebrow">YOUR TRIP</span>
      <h3>{flight.from} → {flight.to}</h3>
      <div className="summary-line"><span>Flight</span><strong>{flight.flightNumber}</strong></div>
      <div className="summary-line"><span>Passengers</span><strong>{passengers}</strong></div>
      {seats.length > 0 && <div className="summary-line"><span>Seats</span><strong>{seats.join(", ")}</strong></div>}
      <div className="summary-total"><span>Total</span><strong>₹{calculatedTotal.toLocaleString("en-IN")}</strong></div>
    </div>
  );
}

function TicketPage({ booking, onHome }) {
  if (!booking) return null;

  const downloadPassengerTicket = (passenger, index) => {
    const seat = booking.seats[index] || "-";
    const passengerNumber = index + 1;
    const ticketNumber = `${booking.bookingId}-${passengerNumber}`;
    const passengerFare = Number(booking.flight.price || 0);

    const escapeSvg = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    /*
      Create an SVG that visually matches the ticket shown on screen.
      The SVG is converted to a PNG, so the downloaded file is an image,
      not a text file.
    */
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="820" viewBox="0 0 1400 820">
        <rect width="1400" height="820" fill="#eef5fb"/>

        <rect x="70" y="60" width="1260" height="700" rx="30" fill="#ffffff" stroke="#d8e3ef" stroke-width="3"/>

        <rect x="70" y="60" width="1260" height="120" rx="30" fill="#0b3b66"/>
        <rect x="70" y="150" width="1260" height="30" fill="#0b3b66"/>

        <text x="115" y="135" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">✈ LET&apos;S GO</text>
        <text x="1240" y="112" text-anchor="end" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#bcd9f5">E-TICKET</text>
        <text x="1240" y="143" text-anchor="end" font-family="Arial, sans-serif" font-size="21" font-weight="700" fill="#ffffff">${escapeSvg(ticketNumber)}</text>

        <text x="120" y="235" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#6b7c8f">PASSENGER</text>
        <text x="120" y="280" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#0b3b66">${escapeSvg(passenger.name)}</text>

        <text x="120" y="330" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#6b7c8f">FROM</text>
        <text x="120" y="375" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#123f68">${escapeSvg(booking.flight.from)}</text>
        <text x="120" y="405" font-family="Arial, sans-serif" font-size="17" fill="#65778b">${escapeSvg(booking.flight.fromCity || "")}</text>

        <text x="700" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#1877ff">✈</text>
        <line x1="360" y1="360" x2="610" y2="360" stroke="#1877ff" stroke-width="3" stroke-dasharray="10 8"/>
        <line x1="790" y1="360" x2="1040" y2="360" stroke="#1877ff" stroke-width="3" stroke-dasharray="10 8"/>

        <text x="1060" y="330" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#6b7c8f">TO</text>
        <text x="1060" y="375" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#123f68">${escapeSvg(booking.flight.to)}</text>
        <text x="1060" y="405" font-family="Arial, sans-serif" font-size="17" fill="#65778b">${escapeSvg(booking.flight.toCity || "")}</text>

        <line x1="110" y1="455" x2="1290" y2="455" stroke="#d8e3ef" stroke-width="2" stroke-dasharray="8 8"/>

        <text x="120" y="505" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#6b7c8f">FLIGHT</text>
        <text x="120" y="540" font-family="Arial, sans-serif" font-size="23" font-weight="700" fill="#123f68">${escapeSvg(booking.flight.flightNumber)}</text>

        <text x="380" y="505" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#6b7c8f">DATE</text>
        <text x="380" y="540" font-family="Arial, sans-serif" font-size="23" font-weight="700" fill="#123f68">${escapeSvg(booking.flight.searchData?.departureDate || "-")}</text>

        <text x="650" y="505" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#6b7c8f">DEPARTURE</text>
        <text x="650" y="540" font-family="Arial, sans-serif" font-size="23" font-weight="700" fill="#123f68">${escapeSvg(booking.flight.departure)}</text>

        <text x="900" y="505" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#6b7c8f">ARRIVAL</text>
        <text x="900" y="540" font-family="Arial, sans-serif" font-size="23" font-weight="700" fill="#123f68">${escapeSvg(booking.flight.arrival)}</text>

        <text x="1130" y="505" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#6b7c8f">SEAT</text>
        <text x="1130" y="540" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#1877ff">${escapeSvg(seat)}</text>

        <rect x="110" y="590" width="1180" height="110" rx="18" fill="#f4f8fc"/>
        <text x="140" y="635" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#6b7c8f">PASSENGER ${passengerNumber}</text>
        <text x="140" y="670" font-family="Arial, sans-serif" font-size="21" fill="#123f68">Age: ${escapeSvg(passenger.age)}    Gender: ${escapeSvg(passenger.gender)}</text>
        <text x="1260" y="650" text-anchor="end" font-family="Arial, sans-serif" font-size="16" fill="#6b7c8f">FARE</text>
        <text x="1260" y="682" text-anchor="end" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#123f68">₹${passengerFare.toLocaleString("en-IN")}</text>

        <text x="700" y="735" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#6b7c8f">Thank you for flying with Let&apos;s Go • Have a pleasant journey</text>
      </svg>
    `;

    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1400;
      canvas.height = 820;

      const context = canvas.getContext("2d");
      context.fillStyle = "#eef5fb";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);

      URL.revokeObjectURL(svgUrl);

      canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `LetsGo-${booking.bookingId}-Passenger-${passengerNumber}-${seat}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      alert("Unable to create the ticket image. Please try again.");
    };

    image.src = svgUrl;
  };

  const downloadAllTickets = async () => {
    /*
      Download one PNG per passenger.
      A short delay helps browsers allow multiple downloads.
    */
    for (let index = 0; index < booking.passengers.length; index += 1) {
      downloadPassengerTicket(booking.passengers[index], index);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  return (
    <main className="confirmation-page">
      <div className="success-icon">✓</div>
      <span className="eyebrow">BOOKING CONFIRMED</span>
      <h1>Your trip is booked!</h1>
      <p>Your Let's Go journey is ready. Have a great flight, {booking.passengers[0]?.name}.</p>

      <div className="ticket">
        <div className="ticket-top">
          <div className="ticket-brand">✈ LET'S GO</div>
          <div><small>BOOKING ID</small><strong>{booking.bookingId}</strong></div>
        </div>

        <div className="ticket-route">
          <div><small>FROM</small><strong>{booking.flight.from}</strong></div>
          <div className="ticket-plane">───── ✈ ─────</div>
          <div><small>TO</small><strong>{booking.flight.to}</strong></div>
        </div>

        <div className="ticket-details">
          <div><small>PASSENGERS</small><strong>{booking.passengerCount}</strong></div>
          <div><small>FLIGHT</small><strong>{booking.flight.flightNumber}</strong></div>
          <div><small>SEATS</small><strong>{booking.seats.join(", ")}</strong></div>
          <div><small>DATE</small><strong>{booking.flight.searchData?.departureDate || "-"}</strong></div>
        </div>

        <div className="ticket-passenger-list">
          {booking.passengers.map((passenger, index) => (
            <div key={index}>
              <strong>Passenger {index + 1}:</strong> {passenger.name} · Seat {booking.seats[index] || "-"}
            </div>
          ))}
        </div>

        <div className="ticket-total"><span>Total Paid</span><strong>₹{booking.total.toLocaleString("en-IN")}</strong></div>
      </div>

      <div className="download-ticket-list">
        <h2>Your tickets</h2>
        <p>Each passenger gets a separate ticket image.</p>
        {booking.passengers.map((passenger, index) => (
          <div className="download-ticket-row" key={index}>
            <div>
              <strong>Passenger {index + 1}: {passenger.name}</strong>
              <span>Seat {booking.seats[index] || "-"} · {booking.flight.from} → {booking.flight.to}</span>
            </div>
            <button
              className="secondary-button"
              onClick={() => downloadPassengerTicket(passenger, index)}
            >
              ↓ Download PNG
            </button>
          </div>
        ))}
      </div>

      <div className="ticket-actions">
        <button className="secondary-button" onClick={() => window.print()}>🖨 Print Ticket</button>
        <button className="primary-button" onClick={downloadAllTickets}>
          ↓ Download {booking.passengers.length > 1 ? "All Tickets" : "Ticket"}
        </button>
      </div>
      <button className="home-link" onClick={onHome}>← Back to Let's Go</button>
    </main>
  );
}

function AuthPromptPage({ onLogin, onSignup, onBack }) {
  return (
    <main className="auth-page">
      <div className="auth-card auth-prompt-card">
        <div className="auth-logo">✈ LET'S GO</div>
        <h1>Login required</h1>
        <p>Please log in or create a new account before searching and booking flights.</p>
        <button className="primary-button full" onClick={onLogin}>Log in</button>
        <button className="secondary-button full" onClick={onSignup}>Create an account</button>
        <button className="home-link" onClick={onBack}>← Back to search</button>
      </div>
    </main>
  );
}

function LoginPage({ onLogin, onSignup, onForgot, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      await onLogin(response.data.user);
    } catch (error) {
      setError(error.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✈ LET'S GO</div>
        <h1>Welcome back</h1>
        <p>Log in to continue your journey.</p>

        <label>EMAIL</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />

        <label>PASSWORD</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />

        {error && <div className="search-error">⚠ {error}</div>}

        <button className="primary-button full" onClick={login} disabled={loading}>{loading ? "Logging in..." : "Log in"}</button>

        <button className="forgot-link" onClick={onForgot}>Forgot password?</button>
        <p className="auth-switch">New to Let's Go? <button onClick={onSignup}>Sign up</button></p>
        <button className="home-link" onClick={onBack}>← Back</button>
      </div>
    </main>
  );
}

function SignupPage({ onLogin, onBack, onSignedUp }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signup = async () => {
    setError("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/signup`, { name, email, password });
      alert("Account created successfully. Please log in.");
      onSignedUp();
    } catch (error) {
      setError(error.response?.data?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✈ LET'S GO</div>
        <h1>Create your account</h1>
        <p>Join Let's Go and start booking your journeys.</p>

        <label>FULL NAME</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />

        <label>EMAIL</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />

        <label>PASSWORD</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />

        <label>CONFIRM PASSWORD</label>
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />

        {error && <div className="search-error">⚠ {error}</div>}

        <button className="primary-button full" onClick={signup} disabled={loading}>{loading ? "Creating account..." : "Sign up"}</button>
        <p className="auth-switch">Already have an account? <button onClick={onLogin}>Log in</button></p>
        <button className="home-link" onClick={onBack}>← Back</button>
      </div>
    </main>
  );
}

function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sendReset = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { email });
      setMessage(response.data?.message || "If an account exists with this email, a password reset link has been sent.");
    } catch (error) {
      setError(error.response?.data?.message || "Unable to send the reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✈ LET'S GO</div>
        <h1>Forgot password?</h1>
        <p>Enter your registered email and we'll send you a password reset link.</p>

        <label>EMAIL</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />

        {error && <div className="search-error">⚠ {error}</div>}
        {message && <div className="auth-success">✓ {message}</div>}

        <button className="primary-button full" onClick={sendReset} disabled={loading}>{loading ? "Sending..." : "Send reset link"}</button>
        <button className="home-link" onClick={onBack}>← Back to login</button>
      </div>
    </main>
  );
}

function ResetPasswordPage({ token, onDone }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const resetPassword = async () => {
    setError("");
    setMessage("");

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/reset-password/${token}`, { password });
      setMessage(response.data?.message || "Password reset successfully.");
      setTimeout(onDone, 1000);
    } catch (error) {
      setError(error.response?.data?.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✈ LET'S GO</div>
        <h1>Reset password</h1>
        <p>Create a new password for your Let's Go account.</p>

        <label>NEW PASSWORD</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />

        <label>CONFIRM PASSWORD</label>
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />

        {error && <div className="search-error">⚠ {error}</div>}
        {message && <div className="auth-success">✓ {message}</div>}

        <button className="primary-button full" onClick={resetPassword} disabled={loading}>{loading ? "Updating..." : "Reset password"}</button>
      </div>
    </main>
  );
}

export default App;
