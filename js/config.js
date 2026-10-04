// Everything you might want to edit lives in this file.
window.App = window.App || {};

const CONFIG = (() => {
  const HER = "Shira";
  const CAT = "Mochi";
  const SITTER = "Biscuit";

  return {
    herName: HER,
    fromName: "Nir", // your name, shown on the date ticket; empty → "me"
    catName: CAT,
    sittingCatName: SITTER,
    // Secret ntfy.sh topic: subscribe to it in the ntfy app to get the notifications.
    ntfyTopic: "shira-date-d371b01f36fbcfff",

    text: {
      question: `${HER}, will you go on a date with me? 🐾`,
      yes: "YES",
      no: "No",
      yayTitle: `YAAAY!! I knew it, ${HER} 💕`,
      yaySub: `${CAT} approves. (She never approves of anything.)`,
      datesTitle: "Okay, now the important part… pick our first date 😽",
      ticketNote: `Screenshot this and send it to me 😽 …actually, ${CAT} already told me.`,
      changePick: "change my pick",
      purr: "purr~ 💗",
      mrrp: "mrrp?!",
      leftChat: "no has left the chat 😼",
    },

    // One entry per "No" attempt, in order. noLabel / yesScale / noSize describe the buttons afterwards.
    attempts: [
      { noLabel: "Are you sure?", caption: `Oops! ${CAT}'s paw slipped 🐾`, yesScale: 1.25, noSize: 1 },
      { noLabel: "Really sure??", caption: `${CAT} is very protective of this button.`, yesScale: 1.5, noSize: 1 },
      { noLabel: "pls 🥺", caption: `${SITTER} is sitting on it. Sorry, those are the rules.`, yesScale: 1.8, noSize: 0.8 },
      { noLabel: "no", caption: "Cats don't take no for an answer.", yesScale: 2.2, noSize: 0.6 },
      { noLabel: "yes 💕", caption: `${CAT} brought it back. With a few edits.`, yesScale: 2.6, noSize: 1 },
    ],

    dateIdeas: [
      { emoji: "☕🐱", title: "Cat café", blurb: "Coffee, surrounded by judgmental cats." },
      { emoji: "🧺", title: "Picnic in the park", blurb: "Sandwiches, sunshine, maybe a stray cat." },
      { emoji: "🍿", title: "Movie night", blurb: "Blanket, snacks, you pick the movie." },
      { emoji: "🍦", title: "Sunset walk + ice cream", blurb: "Golden hour and two scoops." },
      { emoji: "🎁", title: "Surprise me", blurb: `Trust me (and ${CAT}).` },
    ],
  };
})();
