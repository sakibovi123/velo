/** @type {import('tailwindcss').Config} */
export default {
  // Only scan widget source — no leakage into host page
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
