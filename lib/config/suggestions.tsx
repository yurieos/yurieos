import { Atom, Library, Mountain, ScrollText, Telescope } from "lucide-react";

export const SUGGESTIONS = [
  {
    label: "Science",
    highlight: "Analyze",
    prompt: "Analyze",
    items: [
      "Analyze the potential existence of 'Boltzmann Brains'",
      "Analyze the mechanism behind the 'Demon Core' incidents",
      "Analyze the biology of the immortal jellyfish *Turritopsis dohrnii*",
      "Analyze the physics of 'Time Crystals'",
      "Analyze the gravitational anomaly known as the 'Great Attractor'",
    ],
    icon: Atom,
  },
  {
    label: "History",
    highlight: "Uncover",
    prompt: "Uncover",
    items: [
      "Uncover the details of the 'Dancing Plague of 1518'",
      "Uncover the events of the 'Great Molasses Flood'",
      "Uncover the story of the 'Erfurt Latrine Disaster'",
      "Uncover the mystery of the 'Lost Colony of Roanoke'",
      "Uncover the legend of the 'Green Children of Woolpit'",
    ],
    icon: ScrollText,
  },
  {
    label: "Research",
    highlight: "Examine",
    prompt: "Examine",
    items: [
      "Examine the 'Dark Forest' solution to the Fermi Paradox",
      "Examine the psychological effect of 'Liminal Spaces'",
      "Examine the phenomenon of 'Terminal Lucidity' in patients",
      "Examine the implications of the 'Dead Internet Theory'",
      "Examine the 'Overview Effect' experienced by astronauts",
    ],
    icon: Library,
  },
  {
    label: "Rabbit Hole",
    highlight: "Delve into",
    prompt: "Delve into",
    items: [
      "Delve into the mystery of 'Cicada 3301'",
      "Delve into the origin of the 'Toynbee Tiles'",
      "Delve into the 'Max Headroom' signal hijacking",
      "Delve into the world of 'Numbers Stations'",
      "Delve into the strange broadcasts of 'UVB-76' (The Buzzer)",
    ],
    icon: Telescope,
  },
  {
    label: "Adventure",
    highlight: "Journey to",
    prompt: "Journey to",
    items: [
      "Journey to the 'Cave of Crystals' in Mexico",
      "Journey to the 'Door to Hell' in Turkmenistan",
      "Journey to the abandoned 'Hashima Island'",
      "Journey to the 'Zone of Silence' in Mexico",
      "Journey to the mysterious 'Blood Falls' in Antarctica",
    ],
    icon: Mountain,
  },
];
