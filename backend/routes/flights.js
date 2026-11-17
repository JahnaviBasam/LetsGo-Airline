const express = require("express");

const router = express.Router();

/*
  ==========================================
  LET'S GO AIRLINE - AIRPORT DATA
  ==========================================
*/

const airports = [
  {
    code: "DEL",
    city: "New Delhi",
    aliases: ["Delhi", "New Delhi"],
    name: "Indira Gandhi International Airport",
  },
  {
    code: "BLR",
    city: "Bengaluru",
    aliases: ["Bangalore", "Bengaluru"],
    name: "Kempegowda International Airport",
  },
  {
    code: "HYD",
    city: "Hyderabad",
    aliases: ["Hyderabad"],
    name: "Rajiv Gandhi International Airport",
  },
  {
    code: "BOM",
    city: "Mumbai",
    aliases: ["Mumbai", "Bombay"],
    name: "Chhatrapati Shivaji Maharaj International Airport",
  },
  {
    code: "GOI",
    city: "Goa",
    aliases: ["Goa"],
    name: "Manohar International Airport",
  },
  {
    code: "MAA",
    city: "Chennai",
    aliases: ["Chennai", "Madras"],
    name: "Chennai International Airport",
  },
  {
    code: "VGA",
    city: "Vijayawada",
    aliases: ["Vijayawada"],
    name: "Vijayawada International Airport",
  },
  {
    code: "CCU",
    city: "Kolkata",
    aliases: ["Kolkata", "Calcutta"],
    name: "Netaji Subhas Chandra Bose International Airport",
  },
  {
    code: "PNQ",
    city: "Pune",
    aliases: ["Pune"],
    name: "Pune International Airport",
  },
  {
    code: "COK",
    city: "Kochi",
    aliases: ["Kochi", "Cochin"],
    name: "Cochin International Airport",
  },
];

/*
  ==========================================
  AIRLINES
  ==========================================
*/

const airlines = [
  {
    name: "Let's Go Airways",
    prefix: "LG",
  },
  {
    name: "Sky India",
    prefix: "SI",
  },
  {
    name: "AirConnect",
    prefix: "AC",
  },
];

/*
  ==========================================
  FLIGHT SCHEDULES
  ==========================================
*/

const flightSchedules = [
  {
    departure: "06:30",
    arrival: "09:15",
    duration: "2h 45m",
  },
  {
    departure: "11:20",
    arrival: "14:10",
    duration: "2h 50m",
  },
  {
    departure: "18:45",
    arrival: "21:35",
    duration: "2h 50m",
  },
];

/*
  ==========================================
  FIND AIRPORT
  ==========================================

  This accepts:

  HYD
  Hyderabad
  HYDERABAD

  BLR
  Bengaluru
  Bangalore

  DEL
  Delhi
  New Delhi
*/

function findAirport(value) {
  if (!value) {
    return null;
  }

  const searchValue = String(value)
    .trim()
    .toLowerCase();

  return airports.find((airport) => {
    // Airport code
    if (airport.code.toLowerCase() === searchValue) {
      return true;
    }

    // Main city name
    if (airport.city.toLowerCase() === searchValue) {
      return true;
    }

    // Alternative city names
    return airport.aliases.some(
      (alias) => alias.toLowerCase() === searchValue
    );
  });
}

/*
  ==========================================
  GENERATE FLIGHTS
  ==========================================
*/

function generateFlights(fromAirport, toAirport) {
  /*
    SAME SOURCE AND DESTINATION
    = NO FLIGHTS
  */

  if (fromAirport.code === toAirport.code) {
    return [];
  }

  /*
    Generate 3 different flights
  */

  return flightSchedules.map((schedule, index) => {
    const airline = airlines[index];

    /*
      Different prices for each flight.
    */

    const basePrice =
      3299 +
      index * 850 +
      Math.floor(Math.random() * 300);

    return {
      id: `${airline.prefix}-${fromAirport.code}-${toAirport.code}-${index + 1}`,

      airline: airline.name,

      flightNumber: `${airline.prefix} ${101 + index}`,

      from: fromAirport.code,

      fromCity: fromAirport.city,

      to: toAirport.code,

      toCity: toAirport.city,

      departure: schedule.departure,

      arrival: schedule.arrival,

      duration: schedule.duration,

      price: basePrice,
    };
  });
}

/*
  ==========================================
  GET AIRPORTS
  ==========================================
*/

router.get("/airports", (req, res) => {
  res.json({
    airports,
  });
});

/*
  ==========================================
  SEARCH FLIGHTS
  ==========================================
*/

router.get("/search", (req, res) => {
  const {
    from,
    to,
    date,
    passengers,
  } = req.query;

  /*
    Check required fields
  */

  if (!from || !to || !date) {
    return res.status(400).json({
      message: "From, To and Date are required.",
      flights: [],
    });
  }

  /*
    Convert whatever the frontend sends
    into actual airport objects.
  */

  const fromAirport = findAirport(from);
  const toAirport = findAirport(to);

  /*
    SOURCE NOT FOUND
  */

  if (!fromAirport) {
    return res.status(400).json({
      message: `Source airport ${from} was not found.`,
      flights: [],
    });
  }

  /*
    DESTINATION NOT FOUND
  */

  if (!toAirport) {
    return res.status(400).json({
      message: `Destination airport ${to} was not found.`,
      flights: [],
    });
  }

  /*
    ========================================
    SOURCE = DESTINATION
    ========================================
  */

  if (fromAirport.code === toAirport.code) {
    return res.json({
      flights: [],

      search: {
        from: fromAirport.code,
        fromCity: fromAirport.city,

        to: toAirport.code,
        toCity: toAirport.city,

        date,

        passengers: passengers || 1,
      },

      message:
        "Source and destination cannot be the same.",
    });
  }

  /*
    ========================================
    GENERATE 3 FLIGHTS
    ========================================
  */

  const results = generateFlights(
    fromAirport,
    toAirport
  );

  /*
    ========================================
    SEND RESPONSE
    ========================================
  */

  res.json({
    flights: results,

    search: {
      from: fromAirport.code,
      fromCity: fromAirport.city,

      to: toAirport.code,
      toCity: toAirport.city,

      date,

      passengers: passengers || 1,
    },
  });
});

module.exports = router;