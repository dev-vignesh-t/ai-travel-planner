const Trip = require('../models/Trip');

// Exponential backoff for Gemini API resilience
async function fetchWithRetry(url, options, retries = 5, delay = 1000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        await new Promise((r) => setTimeout(r, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      throw new Error(`Gemini API Error: Status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

function buildGenerationPrompt({ destination, durationDays, budgetTier, interests }) {
  return `
    Create a detailed travel plan for a ${durationDays}-day trip to ${destination}.
    Budget preference is ${budgetTier}. Interests are: ${interests.join(', ')}.

    Output ONLY a valid JSON object matching this exact structure:
    {
      "itinerary": [
        { "dayNumber": 1, "activities": [
          { "title": "Activity name", "description": "Brief detail", "estimatedCostUSD": 20, "timeOfDay": "Morning" }
        ] }
      ],
      "hotels": [
        { "name": "Hotel name", "tier": "Budget", "estimatedCostNightUSD": 85, "rating": "4.5/5" }
      ],
      "estimatedBudget": { "transport": 120, "accommodation": 300, "food": 150, "activities": 100, "total": 670 },
      "packingList": [
        { "item": "Passport", "category": "Documents", "isPacked": false }
      ]
    }

    STRICT RULES — do not break these:
    - "timeOfDay" must be EXACTLY one of: "Morning", "Afternoon", "Evening". Never use "Late Morning", "Night", or anything else.
    - "category" in packingList must be EXACTLY one of: "Documents", "Clothing", "Gear", "Other". Never invent new categories.

    Match estimates to realistic local rates for the given budgetTier. Base packingList
    on the destination's typical climate and planned activities.
  `;
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const data = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned an empty response');
  return JSON.parse(text);
}

function normalizeCategory(category) {
  const map = {
    documents: 'Documents', essentials: 'Documents', money: 'Documents',
    clothing: 'Clothing', footwear: 'Clothing', accessories: 'Clothing',
    gear: 'Gear', electronics: 'Gear', 'adventure gear': 'Gear', bags: 'Gear'
  };
  const key = (category || '').toLowerCase().trim();
  return map[key] || 'Other';
}

function normalizeTimeOfDay(timeOfDay) {
  const value = (timeOfDay || '').toLowerCase();
  if (value.includes('morning')) return 'Morning';
  if (value.includes('evening') || value.includes('night')) return 'Evening';
  return 'Afternoon';
}

function sanitizeTripData(result) {
  return {
    ...result,
    itinerary: (result.itinerary || []).map((day) => ({
      ...day,
      activities: (day.activities || []).map((activity) => ({
        ...activity,
        timeOfDay: normalizeTimeOfDay(activity.timeOfDay)
      }))
    })),
    packingList: (result.packingList || []).map((item) => ({
      ...item,
      category: normalizeCategory(item.category)
    }))
  };
}

exports.generateNewTrip = async (req, res) => {
      console.log('Body received:', req.body); // temporary debug line
  const { destination, durationDays, budgetTier, interests } = req.body;
  try {
    const prompt = buildGenerationPrompt({ destination, durationDays, budgetTier, interests });
    const result = sanitizeTripData(await callGemini(prompt));   // ← changed line

    const newTrip = new Trip({
      userId: req.user.id,
      destination, durationDays, budgetTier, interests,
      itinerary: result.itinerary,
      hotels: result.hotels,
      estimatedBudget: result.estimatedBudget,
      packingList: result.packingList
    });

    const savedTrip = await newTrip.save();
    res.status(201).json(savedTrip);
  } catch (error) {
    console.error('Trip generation failed:', error.message);
    res.status(500).json({ message: 'Could not generate trip. Please try again.' });
  }
};

// GET /api/trips
exports.getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch trips' });
  }
};

// GET /api/trips/:id
exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch trip' });
  }
};

// PUT /api/trips/:id
exports.updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true }
    );
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update trip' });
  }
};

// PUT /api/trips/:id/regenerate-day/:dayNumber
exports.regenerateDay = async (req, res) => {
  const { feedback } = req.body;
  const dayNumber = Number(req.params.dayNumber);

  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const prompt = `
      The user is on a ${trip.durationDays}-day trip to ${trip.destination} with a
      ${trip.budgetTier} budget, interests in ${trip.interests.join(', ')}.
      Regenerate ONLY Day ${dayNumber} based on this feedback: "${feedback}".

      Output ONLY a valid JSON object matching this exact structure:
      { "dayNumber": ${dayNumber}, "activities": [
        { "title": "...", "description": "...", "estimatedCostUSD": 0, "timeOfDay": "Morning" }
      ] }

      STRICT RULE — do not break this:
      - "timeOfDay" must be EXACTLY one of: "Morning", "Afternoon", "Evening". Never use
        "Late Morning", "Night", or anything else.
    `;

    const newDay = await callGemini(prompt);

    // Safety net: sanitize even though the prompt is strict, since LLM output
    // isn't guaranteed to match the schema every time
    newDay.activities = (newDay.activities || []).map((activity) => ({
      ...activity,
      timeOfDay: normalizeTimeOfDay(activity.timeOfDay)
    }));

    trip.itinerary = trip.itinerary.map((day) =>
      day.dayNumber === dayNumber ? newDay : day
    );

    await trip.save();
    res.status(200).json(trip);
  } catch (error) {
    console.error('Day regeneration failed:', error.message);
    res.status(500).json({ message: 'Could not regenerate day. Please try again.' });
  }
};

// DELETE /api/trips/:id
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete trip' });
  }
};