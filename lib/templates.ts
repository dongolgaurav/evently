export type EventTemplate = {
  key: string;
  name: string;
  icon: string;
  category: string;
  blurb: string;
  title: string;
  timeWindow: string;
  attendees: number;
  budget: number;
  concept: string;
};

export const TEMPLATES: EventTemplate[] = [
  {
    key: "hackathon",
    name: "24h Hackathon",
    icon: "terminal",
    category: "Academic/Tech",
    blurb: "Overnight build event with mentors, judging and prizes.",
    title: "Campus Hackathon",
    timeWindow: "24h overnight",
    attendees: 150,
    budget: 2500,
    concept:
      "A 24-hour hackathon with an opening keynote, mentor office hours, a midnight food run, project demos and judging. Need overnight building access and enough power and Wi-Fi for every team.",
  },
  {
    key: "social",
    name: "Welcome Social",
    icon: "local_cafe",
    category: "Social",
    blurb: "Low-pressure mixer for new and returning members.",
    title: "Welcome Mixer",
    timeWindow: "5:00–8:00 PM",
    attendees: 80,
    budget: 650,
    concept:
      "A relaxed evening social for new members with drinks and snacks, name tags, two icebreaker activities and a short intro to the club and its upcoming events.",
  },
  {
    key: "panel",
    name: "Alumni Career Panel",
    icon: "school",
    category: "Career",
    blurb: "Moderated panel, audience Q&A and networking.",
    title: "Alumni Industry Panel",
    timeWindow: "6:00–8:30 PM",
    attendees: 100,
    budget: 400,
    concept:
      "A moderated panel with four alumni speakers, audience Q&A and a networking session with refreshments afterwards. Speakers need parking details and a briefing beforehand.",
  },
  {
    key: "workshop",
    name: "Hands-on Workshop",
    icon: "construction",
    category: "Workshop",
    blurb: "Instructor-led session with exercises and helpers.",
    title: "Skills Workshop",
    timeWindow: "4:00–7:00 PM",
    attendees: 40,
    budget: 300,
    concept:
      "A three-hour beginner-friendly workshop with a guided walkthrough, a hands-on exercise in small groups and helpers circulating. Attendees bring laptops and install software beforehand.",
  },
  {
    key: "fundraiser",
    name: "Bake Sale Fundraiser",
    icon: "volunteer_activism",
    category: "Fundraiser",
    blurb: "Table sale with shifts, pricing and a cash count.",
    title: "Club Fundraiser",
    timeWindow: "10:00 AM–4:00 PM",
    attendees: 200,
    budget: 250,
    concept:
      "A one-day table sale in a busy part of campus to raise money for the club. Needs a table booking, a price list, card and cash payment, and volunteers in two-person shifts.",
  },
  {
    key: "showcase",
    name: "Cultural Showcase",
    icon: "theater_comedy",
    category: "Social",
    blurb: "Evening of performances, food and decor.",
    title: "Cultural Night Showcase",
    timeWindow: "6:00–9:30 PM",
    attendees: 250,
    budget: 1800,
    concept:
      "An evening showcase with six student performances, catered dinner, decorations and an MC. Needs a stage, sound and lighting, a rehearsal slot and a seating plan.",
  },
];
