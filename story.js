/* story.js: all content lives here (engine = app.js, untouched).
   STEP TYPES  say {who,text|sticker|voice,only?,pause?} | choices {options:[{label,say,goto,only?}]} | label {id} | goto {to} | end
   `text` may be a string or {morning,afternoon,evening,night}.  Periods: morning 5-11, afternoon 12-16, evening 17-21, night 22-4.
   `goto` jumps to a label in the same scene first, otherwise to a scene id.
   VOICE NOTES: each slot lives in `voices` below. Replace `audioSrc: SLOT` with your own file, e.g. 'audio/rm_wish.mp3'. */
(function () {
  const P = (morning, afternoon, evening, night) => ({ morning, afternoon, evening, night });
  const L = (who, text) => ({ who, text });
  const M = (who, ...texts) => texts.map((t) => L(who, t));                 // several bubbles from one member (reply lines)
  const seq = (...parts) => [].concat(...parts);                              // join reply lines
  const say = (who, text, extra) => Object.assign({ type: 'say', who, text }, extra);
  const T = (who, ...texts) => texts.map((t) => say(who, t));                 // several bubbles from one member (scene steps)
  const stick = (who, id, extra) => Object.assign({ type: 'say', who, sticker: id }, extra);
  const voice = (who, id, extra) => Object.assign({ type: 'say', who, voice: id }, extra);
  const label = (id) => ({ type: 'label', id });
  const go = (to) => ({ type: 'goto', to });
  const opt = (lbl, saying, to) => ({ label: lbl, say: saying, goto: to });
  const ask = (...options) => ({ type: 'choices', options });

  // Placeholder clip so every voice slot plays out of the box (a short generated jingle). Swap per slot for your own files.
  function jingle(notes) {
    try {
      const sr = 8000, d = [];
      for (const [f, ms] of notes) {
        const n = (sr * ms / 1000) | 0;
        for (let i = 0; i < n; i++) d.push(128 + Math.round(Math.sin(2 * Math.PI * f * i / sr) * 60 * Math.min(1, i / 200, (n - i) / 500)));
      }
      const h = new DataView(new ArrayBuffer(44)), w = (o, s) => [...s].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); h.setUint32(4, 36 + d.length, true); w(8, 'WAVEfmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true);
      h.setUint16(22, 1, true); h.setUint32(24, sr, true); h.setUint32(28, sr, true); h.setUint16(32, 1, true); h.setUint16(34, 8, true);
      w(36, 'data'); h.setUint32(40, d.length, true);
      const b = new Uint8Array(44 + d.length); b.set(new Uint8Array(h.buffer)); b.set(d, 44);
      let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
      return 'data:audio/wav;base64,' + btoa(s);
    } catch (e) { return ''; }
  }
  const SLOT = jingle([[523, 300], [659, 300], [784, 300], [659, 300], [880, 520]]);

  window.STORY = {
    version: '2.0.0',
    groupName: 'BTS Christmas Chat',
    groupEmoji: '🎄',
    joinNote: '🎄 You joined the Christmas chat',
    start: 'arrival',

    members: {
      rm: { name: 'RM', badge: 'RM', color: '#a78bfa', aliases: ['rm', 'namjoon', 'joon', 'namjoonie'], mention: [
        M('rm', "i'm here. quick report: i dropped my phone in a snowbank. it's fine. it's a small snowbank."),
        seq(M('rm', 'good to hear from you. have you eaten, and have you rested? those are two different questions.')),
        seq(M('rm', "i had a thought a minute ago. it was good. i've lost it. i'll find it later, like my keys."), M('suga', 'he lost the keys again'))] },
      jin: { name: 'Jin', badge: 'JN', color: '#fb7185', aliases: ['jin', 'seokjin', 'jinnie'], mention: [
        seq(M('jin', 'worldwide handsome has entered the chat', 'did someone say my name?', 'it was probably a compliment')),
        seq(M('jin', 'sit sit sit', 'have you eaten', 'the answer is no, i can tell. come eat')),
        seq(M('jin', 'i have a joke', 'what do you call a snowman with a six pack?', 'an abdominal snowman'), M('suga', 'no.'))] },
      suga: { name: 'Suga', badge: 'SG', color: '#cbd5e1', aliases: ['suga', 'yoongi', 'min yoongi'], mention: [
        M('suga', "i was asleep. hi.", 'have you eaten'),
        seq(M('suga', 'hm. you called'), M('jhope', 'he says that but he saw the notification in 2 seconds ㅋㅋㅋ')),
        M('suga', "i'm here. don't stay up too late")] },
      jhope: { name: 'J-Hope', badge: 'JH', color: '#fb923c', aliases: ['j-hope', 'jhope', 'hobi', 'hoseok'], mention: [
        M('jhope', 'HI!! ahaha you called the sunshine!!', 'how are you actually feeling today??'),
        M('jhope', "ㅋㅋㅋ i'm here!! energy at maximum!!", "tell me one good thing from today, even a tiny one"),
        seq(M('jhope', 'yes yes yes!! ahaha'), M('jimin', 'he heard his name from the other room'))] },
      jimin: { name: 'Jimin', badge: 'JM', color: '#facc15', aliases: ['jimin', 'chim', 'jiminie'], mention: [
        M('jimin', 'hi, you. i was hoping you would say something 🥹', 'how was your day? the small parts too'),
        seq(M('jimin', "i'm here. jin-hyung is burning something again, so i'm hiding in the chat"), M('jin', 'it is CARAMELIZING')),
        M('jimin', 'i noticed you went quiet for a bit', 'everything okay?')] },
      v: { name: 'V', badge: 'V', color: '#34d399', aliases: ['v', 'taehyung', 'tae', 'taetae'], mention: [
        M('v', 'hi. random question: if snow had a flavor, what would it be?'),
        M('v', "i was just looking at a street lamp for 10 minutes. it felt important", 'anyway, hi'),
        seq(M('v', 'oh! you called me'), M('jungkook', 'he was talking to a plant earlier'))] },
      jungkook: { name: 'Jungkook', badge: 'JK', color: '#38bdf8', aliases: ['jungkook', 'jk', 'kook', 'jeongguk', 'kookie'], mention: [
        M('jungkook', 'ME?? i am here', 'what did i miss', 'is there food'),
        seq(M('jungkook', "i can explain", "the dumplings were unattended"), M('jin', 'THEY WERE FOR THE PHOTO')),
        M('jungkook', 'okay i challenge you to anything', 'cards? arm wrestle? who finishes the cookies first?')] }
    },

    scenes: {
      /* ============ SCENE 1: time-aware arrival + mood check-in ============ */
      arrival: { title: 'She just came online', steps: [
        // morning
        say('jin', 'good morning 🌞', { only: ['morning'], pause: 500 }),
        ...T('jin', 'what do snowmen eat for breakfast', 'snowflakes', "i'll be here all winter").map((s) => Object.assign(s, { only: ['morning'] })),
        say('jhope', 'wait she is ONLINE?? ahaha good morning!!', { only: ['morning'] }),
        say('suga', 'morning. have you eaten. real food, not just coffee', { only: ['morning'] }),
        // afternoon
        say('jhope', 'AFTERNOON!! she is here ㅋㅋㅋ', { only: ['afternoon'], pause: 500 }),
        say('jungkook', 'did you eat lunch?? tell me you ate lunch', { only: ['afternoon'] }),
        say('jungkook', 'because i had two lunches', { only: ['afternoon'] }),
        say('suga', 'eat properly. then nap. in that order', { only: ['afternoon'] }),
        // evening
        say('v', 'evening. the sky just did the blue-orange thing', { only: ['evening'], pause: 500 }),
        say('jin', 'dinner hour. i am cooking. dramatically', { only: ['evening'] }),
        say('jimin', 'welcome back 🥹 how was your day?', { only: ['evening'] }),
        // late night
        say('suga', '...it is late. why are you up', { only: ['night'], pause: 500 }),
        say('rm', "no judgment. i'm up too, thinking about things i can't solve at this hour", { only: ['night'] }),
        say('v', 'late night is when the best thoughts show up. and the worst snacks', { only: ['night'] }),
        say('jungkook', 'did someone say snacks', { only: ['night'] }),
        // everyone
        say('jungkook', 'okay everyone act normal. she is here.'),
        say('jin', 'i am acting normal. i am extremely normal.'),
        say('jimin', 'you are holding a ladle, hyung'),
        say('rm', "hey. before the chaos starts: how are you actually doing today?"),
        say('jhope', 'yes!! tell us the real answer ahaha, we can take it'),
        ask(opt('✨ Great', "I'm doing great today ✨", 'm_great'), opt('🧸 Cozy', 'Cozy, actually 🧸', 'm_cozy'),
          opt('😴 Tired', "Honestly, tired 😴", 'm_tired'), opt('😵 Stressed', "A bit stressed 😵", 'm_stress')),

        label('m_great'),
        say('jhope', 'AHAHA YES!! ㅋㅋㅋ keep that energy, we need it'),
        say('jimin', 'that makes me so happy to hear'),
        say('jin', 'this calls for dessert', { pause: 500 }), say('jin', 'every call does, really'),
        go('chaos'),
        label('m_cozy'),
        say('v', 'cozy is the best weather inside a person'),
        say('suga', 'good. stay there'),
        say('jimin', 'blanket and warm socks? i hope so'),
        go('chaos'),
        label('m_tired'),
        say('suga', 'then sleep is part of the plan today. eat something first'),
        say('rm', "rest isn't laziness. i'd like that on record"),
        ...T('jin', 'i am sending you soup through the screen', 'can you feel it', 'it is warm'),
        go('chaos'),
        label('m_stress'),
        say('jhope', "hey, hey. we are here. breathe with me for a second"),
        say('rm', 'one thing at a time. only the next thing'),
        say('suga', 'drink some water. i mean it'),
        say('jungkook', 'we are on your team, you know that right'),
        go('chaos')
      ] },

      /* ============ SCENE 2: snacks, winter playlists, gift chaos ============ */
      chaos: { title: 'Holiday chaos', steps: [
        ...T('jungkook', 'okay status report', 'snacks acquired: 14', 'snacks remaining: 3', 'do not ask'),
        ...T('jin', 'he ate the dumplings i was saving for the group photo', 'the. dumplings.', 'i am not mad', 'i am disappointed and also mad'),
        say('jimin', 'jungkook-ah 🥲'),
        say('jungkook', 'they were unattended'),
        say('suga', 'he does this every year'),
        say('v', 'i made a winter playlist'),
        say('v', "it's mostly my songs. that is not bragging. that is curation"),
        say('jimin', 'taehyung-ah, you put four of your own on there, 😂'),
        say('v', 'winter bear, snow flower, christmas tree, winter ahead. and christmas love for balance'),
        say('jhope', 'ahaha the full V winter collection ㅋㅋㅋ'),
        voice('v', 'v_winter'),
        say('v', 'which one first?'),
        ask(opt('🐻 Winter Bear', 'Winter Bear first 🐻', 'p_bear'), opt('🌨️ Snow Flower', 'Snow Flower first 🌨️', 'p_snow'),
          opt('💝 Christmas Love', 'Christmas Love first 💝', 'p_love'), opt('🎄 Christmas Tree', 'Christmas Tree first 🎄', 'p_tree'),
          opt('🌅 Winter Ahead', 'Winter Ahead first 🌅', 'p_ahead')),

        label('p_bear'),
        say('v', 'winter bear. a gentle choice. a bear in a scarf'),
        say('jimin', 'so soft. i love it'),
        say('suga', 'good for naps'),
        go('gifts'),
        label('p_snow'),
        say('jhope', 'snow flower!! very cinematic ahaha'),
        say('v', 'it sounds like snow falling slowly in a dream'),
        say('rm', 'i will listen to it by the window tonight'),
        go('gifts'),
        label('p_love'),
        say('jimin', 'a classic. i am already humming'),
        say('jin', 'sing it with me', { pause: 400 }), say('jin', 'i will lead. you follow. like a dance'),
        say('jungkook', 'i know every part of it'),
        go('gifts'),
        label('p_tree'),
        say('v', 'christmas tree. the quiet one. nice'),
        say('rm', 'it feels like turning off the room lights and sitting by the tree'),
        say('jimin', "i'm getting a little emotional, honestly"),
        go('gifts'),
        label('p_ahead'),
        say('rm', 'winter ahead. such a calm title'),
        say('suga', "it's warm. play it loud"),
        say('jhope', 'a good one for walking home in the cold!!'),
        go('gifts'),

        label('gifts'),
        ...T('jin', 'gift update: i bought a 2 meter inflatable reindeer', 'it is for the group', 'it is in the living room', 'it is looking at me'),
        say('jimin', 'hyung, it is just a reindeer'),
        say('jin', 'it has FEELINGS jimin'),
        voice('jin', 'jin_dad'),
        say('suga', 'no'),
        say('rm', 'i hid my gift somewhere safe'),
        say('rm', "i can't find it"),
        say('rm', 'it was so safe that even i could not find it'),
        say('jhope', 'ahaha RM-hyung!! ㅋㅋㅋ'),
        say('suga', 'i got everyone socks'),
        say('jungkook', 'SOCKS AGAIN??'),
        say('v', 'i got a gift for the moon. is that allowed'),
        stick('jungkook', 'shock'),
        say('jimin', 'okay, now we ask her some questions. we planned this'),
        go('qna')
      ] },

      /* ============ SCENE 3: interactive mini Q&A ============ */
      qna: { title: 'Fun questions', steps: [
        say('jhope', 'friendly interrogation!! ahaha ㅋㅋㅋ'),
        say('jimin', 'first one from me. what is your ideal cozy winter night?'),
        ask(opt('🎬 Blanket + movie', 'Blanket, a movie, and nobody bothering me 🎬', 'a_movie'), opt('❄️ Snow walk', 'A slow walk in the snow ❄️', 'a_walk'),
          opt('☕ Cocoa + music', 'Hot cocoa and soft music ☕', 'a_cocoa'), opt('🍲 Cooking together', 'Cooking something warm with people I love 🍲', 'a_cook')),

        label('a_movie'),
        say('suga', 'correct answer. top tier'),
        say('jimin', 'i can picture it. lamp on, socks on'),
        go('q2'),
        label('a_walk'),
        say('v', 'oh. the kind of snow that makes everything quiet. i love it'),
        say('rm', 'and you can hear your own thoughts for once'),
        go('q2'),
        label('a_cocoa'),
        say('jhope', 'COCOA!! with marshmallows? ahaha say yes'),
        say('jin', 'i make the best cocoa. i will not elaborate. i will elaborate. later'),
        go('q2'),
        label('a_cook'),
        ...T('jin', 'THIS PERSON', 'i love this person'),
        say('jungkook', 'can i come? i can taste test'),
        go('q2'),

        label('q2'),
        say('jungkook', 'my turn!! favorite snack. think carefully. this is important'),
        voice('jungkook', 'jk_snack'),
        ask(opt('🌶️ Tteokbokki', 'Spicy tteokbokki 🌶️', 'b_tok'), opt('🍪 Cookies', 'Cookies, always 🍪', 'b_cookie'),
          opt('🍗 Fried chicken', 'Fried chicken 🍗', 'b_chick'), opt('🍰 Something sweet', 'Anything sweet 🍰', 'b_sweet')),

        label('b_tok'),
        say('jungkook', 'YES. respect. spicy gang'),
        say('rm', 'my stomach just filed a complaint'),
        go('q3'),
        label('b_cookie'),
        say('jimin', 'cookies are safe, warm, and honest 🍪'),
        say('jin', 'i will bake some', { pause: 400 }), say('jin', 'jungkook will not eat them'),
        go('q3'),
        label('b_chick'),
        say('jungkook', 'we are going to be best friends'),
        say('suga', 'good call. chicken at midnight is a classic'),
        go('q3'),
        label('b_sweet'),
        say('jhope', 'ahaha my sweet tooth is clapping right now'),
        say('v', 'the best desserts taste like a small secret'),
        go('q3'),

        label('q3'),
        say('v', 'last one. what does your perfect christmas song feel like?'),
        ask(opt('🎷 Soft jazz', 'Soft jazz, like a warm room 🎷', 'c_jazz'), opt('🎉 Upbeat & sparkly', 'Upbeat and sparkly 🎉', 'c_pop'),
          opt('🌙 Slow & sleepy', 'Slow and sleepy 🌙', 'c_slow'), opt('🔔 Classic carols', 'Classic carols 🔔', 'c_carol')),

        label('c_jazz'),
        say('v', 'jazz. i knew you were one of us'),
        say('rm', 'a piano in a quiet room. that is a very good Christmas'),
        go('q_end'),
        label('c_pop'),
        say('jhope', 'SPARKLY!! ahaha we are the same person'),
        say('jungkook', 'i will make a playlist. a loud one'),
        go('q_end'),
        label('c_slow'),
        say('suga', 'slow and sleepy. correct'),
        say('jimin', 'perfect for a late night at home'),
        go('q_end'),
        label('c_carol'),
        say('jin', 'classics never lose. like me'),
        say('rm', 'there is something comforting in songs everyone knows'),
        go('q_end'),

        label('q_end'),
        say('rm', "thank you for answering. i'll remember it. i will probably lose the note, but i'll remember it"),
        say('jin', 'ahem. there is one more thing. we should do it now'),
        go('wish')
      ] },

      /* ============ SCENE 4: secret Christmas wish / finale ============ */
      wish: { title: 'The wish', steps: [
        say('rm', 'okay. the chaos can rest for a minute.', { pause: 900 }),
        say('suga', 'yeah. we wanted to say something', { pause: 900 }),
        say('jin', 'i am serious for a minute. please admire this', { pause: 700 }),
        say('jhope', 'we hope you are happy. the quiet kind, not the kind you put on for other people', { pause: 900 }),
        say('jimin', 'we hope you rest. you carry a lot and you do not always say it. we notice 🥹', { pause: 900 }),
        say('v', 'we hope the new year has a lot of soft light in it. morning light, lamp light, snow light', { pause: 900 }),
        say('jungkook', 'and good food. and people who make you laugh. and wins. a lot of wins', { pause: 900 }),
        say('suga', "eat properly. don't stay up too late. that's the whole wish", { pause: 900 }),
        say('suga', "it is also a lot", { pause: 500 }),
        voice('rm', 'rm_wish', { pause: 900 }),
        say('jimin', "hyung, you almost made me cry", { pause: 700 }),
        voice('suga', 'suga_care'),
        say('jhope', 'SUGA SENT A VOICE NOTE?? ㅋㅋㅋ ahaha', { pause: 500 }),
        say('suga', 'do not'),
        say('jin', 'i have saved it. forever'),
        say('jin', 'happy Christmas, you', { pause: 700 }),
        say('jimin', 'Merry Christmas, from all seven of us'),
        say('jungkook', 'merry christmas!! eat something good!!'),
        say('v', 'merry christmas. look at the lights tonight', { pause: 500 }),
        say('jhope', 'MERRY CHRISTMAS!! ahaha love you!!'),
        say('jin', 'and eat breakfast tomorrow', { only: ['morning'] }),
        say('v', 'enjoy the evening lights. they are doing their best', { only: ['evening'] }),
        say('suga', 'go sleep after this. i am serious', { only: ['night'] }),
        stick('jungkook', 'santa'),
        say('rm', "go whenever you want. we'll be here. and if you want to keep talking, we're here for that too", { pause: 900 }),
        { type: 'end' }
      ] }
    },

    stickers: [
      { id: 'lol',     mood: 'laugh',   emoji: '😂', label: 'Dying' },
      { id: 'love',    mood: 'heart',   emoji: '🥰', label: 'Love it' },
      { id: 'letter',  mood: 'heart',   emoji: '💌', label: 'For you' },
      { id: 'shock',   mood: 'shocked', emoji: '😱', label: 'No way' },
      { id: 'noodles', mood: 'hungry',  emoji: '🍜', label: 'Starving' },
      { id: 'scarf',   mood: 'cozy',    emoji: '🧣', label: 'So cozy' },
      { id: 'tree',    mood: 'festive', emoji: '🎄', label: 'Merry!' },
      { id: 'santa',   mood: 'festive', emoji: '🎅', label: 'Ho ho ho' }
    ],

    stickerReplies: {
      laugh: [
        seq(M('jungkook', 'i can hear this sticker 😭'), M('jhope', 'AHAHA same!! ㅋㅋㅋ')),
        seq(M('jimin', 'now i am laughing too. thanks a lot'), M('suga', '...ok that was funny')),
        seq(M('jin', 'a laugh like that deserves a joke', 'what do you call a sleeping bull?', 'a bulldozer'), M('suga', 'i hate that i smiled')),
        seq(M('v', 'what was the joke? i missed it, i was watching snow'), M('jhope', 'ahaha ㅋㅋㅋ there was no joke, V!!'))],
      heart: [
        seq(M('v', 'aww. we love you more'), M('jin', 'come eat. i am saying it with love')),
        seq(M('jimin', 'my heart 🥹'), M('rm', 'received with gratitude')),
        seq(M('jhope', 'LOVE RECEIVED!! ahaha how are you feeling today, truly?'), M('suga', 'he asks that to everyone. he means it')),
        seq(M('jungkook', 'ok now i am blushing'), M('jimin', 'he is, look at him'))],
      shocked: [
        seq(M('jhope', 'WHAT?? what did i miss?? ahaha'), M('jungkook', 'tell us everything')),
        seq(M('rm', 'should i be worried?'), M('v', 'i am already screaming. quietly. like snow')),
        seq(M('jin', 'did somebody burn something', 'it was not me', 'it was a little me'), M('jimin', 'hyung')),
        seq(M('suga', "that's a big reaction"), M('jungkook', 'WAIT WHAT HAPPENED'))],
      hungry: [
        seq(M('jin', 'say no more. kitchen is open'), M('jungkook', 'i will set the table!!')),
        seq(M('jimin', 'same!! ramen at midnight?'), M('suga', 'i will bring the ramen. do not tell jin')),
        seq(M('jungkook', 'FINALLY someone who gets it', 'what are we eating', 'i can eat again'), M('rm', 'you ate 20 minutes ago')),
        seq(M('v', 'hungry for what? soup? jazz? both?'), M('jhope', 'ahaha both!!'))],
      cozy: [
        seq(M('suga', 'finally, someone who understands'), M('jimin', 'blankets, tea, and this chat')),
        seq(M('v', 'cozy mode: on'), M('jhope', 'i will bring the hot chocolate!!')),
        seq(M('rm', 'a good blanket might be the most underrated invention'), M('jin', 'i am sending a blanket and a bowl of soup')),
        seq(M('jungkook', 'cozy and snacks. that is the whole list'), M('suga', 'no notes'))],
      festive: [
        seq(M('jhope', 'HO HO HOOOO 🎅 ahaha'), M('jin', 'the star is ready. is everyone else?')),
        seq(M('jimin', 'it feels like Christmas now 🎄'), M('v', 'play the music!!')),
        seq(M('jungkook', 'MERRY CHRISTMAS!! where are the cookies'), M('rm', 'there are none. we have lost them. i lost them')),
        seq(M('suga', 'ok. fine. merry christmas'), M('jhope', 'HE SAID IT ㅋㅋㅋ'))]
    },

    /* Voice slots: swap `audioSrc: SLOT` for your own clip path. `duration` is seconds (shown until the file reports its own). */
    voices: {
      v_winter: { audioSrc: SLOT /* 'audio/v_winter.mp3' */, duration: 14,
        transcript: "hi. it's snowing where i am, the quiet kind. i put my songs on the playlist because they sound like this. also, do you think snow has a sound? i think it hums." },
      jin_dad: { audioSrc: SLOT /* 'audio/jin_dad.mp3' */, duration: 11,
        transcript: "okay, important announcement. what do you call a reindeer with no eyes? no eye deer. ahaha. wait, don't leave. i have a snow one too." },
      jk_snack: { audioSrc: SLOT /* 'audio/jk_snack.mp3' */, duration: 9,
        transcript: "ok so it's late, and i'm standing in front of the fridge. i'm not hungry. i'm just looking. okay, i'm hungry. anyway, what's your snack answer? i need it for science." },
      rm_wish: { audioSrc: SLOT /* 'audio/rm_wish.mp3' */, duration: 28,
        transcript: "Hi. I wanted to say this out loud instead of typing it. Whatever this year was, you got through it, and that matters. I hope next year is kinder, and I hope you're proud of yourself. Merry Christmas. Oh, and if I dropped something while recording this, it wasn't important." },
      suga_care: { audioSrc: SLOT /* 'audio/suga_care.mp3' */, duration: 10,
        transcript: "...hey. it's me. i don't do these. eat something warm, sleep, drink water. that's it. merry christmas. don't tell the others i did this." }
    },

    /* ---------- free-text triggers. strings = whole words/phrases, regex = patterns. best match wins ---------- */
    keywords: [
      { id: 'greet', triggers: ['hi', 'hello', 'hey', 'hiya', 'yo', 'good morning', 'good afternoon', 'good evening'], replies: [
        [L('jhope', P('Good morning!! ahaha ☀️', 'Hiii!! ㅋㅋㅋ', 'Evening!! ahaha ✨', 'Hiii, night owl!! ahaha')), L('jimin', 'we were just talking about you')],
        seq(M('v', 'hi. random question: tea or cocoa?'), M('jungkook', 'hi!! did you eat yet?')),
        seq(M('jin', 'hello!', 'have you eaten', 'sit, there are dumplings'), M('suga', 'hey'))] },
      { id: 'xmas', triggers: ['merry christmas', 'happy holidays', 'xmas', 'christmas'], replies: [
        seq(M('jin', 'Merry Christmas!! 🎄'), M('jhope', 'MERRY CHRISTMAS!! ahaha ㅋㅋㅋ')),
        seq(M('jimin', 'Merry Christmas 🥹 this chat is my favorite place right now'), M('suga', 'merry christmas. there. i said it')),
        seq(M('rm', 'Merry Christmas. i hope it is warm and quiet and yours')),
        seq(M('v', 'merry christmas. someone should look at the lights tonight'), M('jungkook', 'merry christmas!! cookies!!'))] },
      { id: 'tree', priority: 2, triggers: [/\b(trees?|ornaments?|decorat\w*|lights|star)\b/], replies: [
        seq(M('jin', 'the star goes on top', 'this is not up for debate'), M('v', 'i will hold the ladder')),
        seq(M('jungkook', 'more lights. then more lights'), M('suga', 'no.')),
        seq(M('rm', 'last year i hung an ornament on the wrong thing. it was a lamp'), M('jimin', 'it looked nice, hyung'))] },
      { id: 'food', triggers: [/\b(food|cook\w*|eat\w*|dinner|lunch|breakfast|dumplings?|bak(e|ing)|soup|recipes?)\b/], replies: [
        seq(M('jin', 'cooking? i am in', 'tteokguk, dumplings, and something sweet'), M('jimin', 'hyung, please do not burn it')),
        seq(M('jungkook', 'did someone say food??', 'i volunteer as taster'), M('rm', 'you volunteer every year')),
        seq(M('suga', 'eat something warm. i mean it'))] },
      { id: 'hungry', priority: 1, triggers: [/\b(hungry|starving|snacks?|midnight|craving\w*|munchies)\b/], replies: [
        seq(M('jungkook', 'SAME', 'i was literally just thinking about the fridge'), M('jin', 'jungkook. no. the dumplings.')),
        seq(M('jimin', 'ramen? a little bowl, a little egg 🥹'), M('suga', 'i will make it. do not tell anyone')),
        seq(M('jungkook', 'ok emergency menu', 'chicken, tteokbokki, ice cream', 'in that order', 'now')),
        seq(M('v', 'what about toast with something warm and a bit of jazz?'))] },
      { id: 'gift', priority: 2, triggers: [/\b(gifts?|presents?|santa|wrapping|wrapped)\b/], replies: [
        seq(M('v', 'i already wrapped mine. it took an hour'), M('jungkook', 'because he kept re-wrapping it')),
        seq(M('rm', 'my gift is somewhere safe. i will report back when i find it')),
        seq(M('jin', 'i bought a 2 meter reindeer', 'it is a gift for all of us', 'it is staring at me'), M('suga', 'return it')),
        seq(M('suga', 'socks'), M('jungkook', 'NOT AGAIN'))] },
      { id: 'music', triggers: [/\b(songs?|sing\w*|carols?|music|playlist|jazz|piano)\b/], replies: [
        seq(M('jimin', 'starts humming something suspiciously festive'), M('jhope', 'OKAY i will find a beat for it!! ahaha')),
        seq(M('jungkook', "i'll sing. someone play the piano"), M('rm', 'we have a piano?')),
        seq(M('v', 'i have a jazz playlist for snowy nights. it will fix any mood'), M('suga', 'send it to me'))] },
      { id: 'vsongs', priority: 3, triggers: ['winter bear', 'snow flower', 'christmas tree', 'winter ahead', 'christmas love'], replies: [
        seq(M('v', 'oh. you know that one?', 'i made it for nights like this'), M('jimin', 'every time it plays, the room goes quiet')),
        seq(M('jhope', 'ahaha you have taste!!', 'put it on, put it on'), M('v', 'turn the lights down first')),
        seq(M('rm', 'that one is a winter classic in this chat'), M('jungkook', 'play it, play it'))] },
      { id: 'snow', triggers: [/\b(snow\w*|winter|frost\w*|blizzard|ice)\b/], replies: [
        seq(M('v', 'snow. do you think it has a sound?'), M('suga', 'stay inside. blanket. tea. best Christmas')),
        seq(M('jhope', 'SNOW!! take a photo and send it!! ahaha'), M('jimin', 'wear a scarf, okay?')),
        seq(M('rm', 'there is a silence that only snow has. i love it'))] },
      { id: 'cold', triggers: [/\b(cold|freezing|chilly|brr+|frozen)\b/], replies: [
        seq(M('suga', 'wear more layers. now'), M('jin', 'i am sending soup')),
        seq(M('jimin', 'warm socks, warm drink, warm blanket 🥹'), M('jungkook', 'hot chocolate is the answer')),
        seq(M('rm', 'i accidentally left my gloves on a bench. do not be like me'))] },
      { id: 'cozy', triggers: [/\b(cozy|blankets?|fireplace|hot chocolate|cocoa|pajamas?|slippers)\b/], replies: [
        seq(M('v', 'cozy mode: lamp on, jazz low, blanket over everything'), M('suga', 'now that is a plan')),
        seq(M('jimin', 'that sounds so nice'), M('jhope', 'i am bringing hot chocolate!! ahaha'))] },
      { id: 'sleepy', priority: 1, triggers: [/\b(sleep\w*|nap|naps|goodnight|good night|gn|bed|bedtime)\b/], replies: [
        seq(M('suga', P('sleep is the best gift. rest', 'a nap? yes. do it', 'go to bed early tonight. i support it', 'go to sleep. i mean it')), M('jin', 'drink some water first')),
        seq(M('rm', 'sleep well. tomorrow can wait for you'), M('jimin', 'sweet dreams 🥹')),
        seq(M('v', 'dream of something snowy'), M('jhope', 'goodnight!! ahaha rest well!!'))] },
      { id: 'tired', priority: 1, triggers: [/\b(tired|exhausted|drained|burnt out|burned out|sleepy|worn out)\b/], replies: [
        seq(M('suga', 'then rest. no one is grading you'), M('jin', 'eat something, then sleep')),
        seq(M('jhope', 'hey. you did enough today. ahaha, for real'), M('jimin', 'sit down, take a breath 🥹')),
        seq(M('rm', 'tiredness is a message. it says slow down. maybe listen to it'))] },
      { id: 'insomnia', priority: 2, triggers: [/\b(can'?t sleep|cannot sleep|insomnia|awake|up late|3 ?am)\b/], replies: [
        seq(M('v', 'late-night thoughts are loud. tell me one'), M('suga', "i'm awake too. we can be quiet together")),
        seq(M('rm', "i'm up as well. i'll keep you company, silently"), M('jungkook', 'i have snacks if that helps ahaha')),
        seq(M('jimin', 'close your eyes for a bit. i will stay here 🥹'))] },
      { id: 'sad', priority: 2, triggers: [/\b(sad|crying|cry|upset|down|hurt|hurts|heartbroken|blue)\b/], replies: [
        seq(M('jhope', 'hey, hey. come here. we are here', 'tell me what happened'), M('jimin', 'you are not alone 🥹')),
        seq(M('rm', "i'm sorry it hurts. you don't have to explain it. i'm listening"), M('suga', 'drink some water. and tell us')),
        seq(M('v', "sad days are like winter. they do pass"), M('jin', 'i am making something warm for you'))] },
      { id: 'stress', priority: 2, triggers: [/\b(stress\w*|anxious|anxiety|overwhelm\w*|deadline|exam|exams|work|boss|busy|pressure|worried)\b/], replies: [
        seq(M('rm', 'one thing at a time. only the next thing'), M('suga', 'water. food. then the work')),
        seq(M('jhope', 'breathe with me, in, out, ahaha good!!', "you can do this. and if not today, tomorrow"), M('jimin', 'i believe in you')),
        seq(M('jungkook', 'we are on your team!! whatever it is'), M('v', 'ten deep breaths. then jazz'))] },
      { id: 'lonely', priority: 2, triggers: [/\b(lonely|alone|miss you all|nobody|no one)\b/], replies: [
        seq(M('jimin', 'you are not alone. this chat is open', 'i am here 🥹'), M('jhope', 'we are right here!! ahaha always')),
        seq(M('rm', "loneliness lies. we're here"), M('jin', 'sit with us. there is food')),
        seq(M('v', "i'm here. i'm not going anywhere. it's snowing and i'm staying"))] },
      { id: 'love', triggers: [/\b(love|miss|missed|adore|appreciate)\b/], replies: [
        seq(M('v', 'we love you too'), M('jungkook', 'okay now i am blushing')),
        seq(M('jimin', 'that means a lot 🥹'), M('suga', 'ok. i love you too. do not repeat it')),
        seq(M('jhope', 'ahaha we feel it!! ㅋㅋㅋ'), M('rm', 'gratitude. truly'))] },
      { id: 'army', priority: 3, triggers: ['army', 'purple', 'borahae', 'bts', 'bangtan'], replies: [
        seq(M('v', 'borahae. i love you, i purple you', 'that was a very good sentence'), M('jimin', 'we feel your love, always 🥹')),
        seq(M('jhope', 'ARMYYY!! ahaha ㅋㅋㅋ', 'we love you too!!'), M('rm', 'you are part of why we keep going')),
        seq(M('jungkook', 'purple heart!! 💜 i mean it'), M('jin', 'we are grateful. and handsome. both'))] },
      { id: 'laugh', triggers: [/\b(lol|lmao|ha(ha)+|hehe+|funny|ㅋ+)\b/, /ㅋㅋ/], replies: [
        seq(M('jhope', 'AHAHA ㅋㅋㅋ you laugh just like me'), M('jungkook', 'i made her laugh!!')),
        seq(M('jimin', 'i love when you laugh'), M('suga', 'good, that was the goal')),
        seq(M('jin', 'my jokes always land', 'say it again, i want it on record'), M('rm', 'they do not, hyung'))] },
      { id: 'joke', priority: 2, triggers: [/\b(joke|jokes|pun|puns|dad joke)\b/], replies: [
        seq(M('jin', 'finally someone asks', 'why did the snowman go to the doctor?', 'he was feeling a little flaky'), M('suga', 'i hate this')),
        seq(M('jin', 'what do you call an elf who sings?', 'a wrapper'), M('jimin', 'hyung 😂')),
        seq(M('jin', 'how does a snowman get around?', 'he rides an icicle', 'ahaha i am a legend'))] },
      { id: 'bye', triggers: [/\b(bye|goodbye|see you|gtg|ttyl|leaving|going now)\b/], replies: [
        seq(M('jhope', 'Byeee!! come back soon ahaha'), M('v', 'take care of yourself')),
        seq(M('suga', 'bye. eat properly'), M('jin', 'bring leftovers next time')),
        seq(M('rm', 'good night, or good day. whichever it is'), M('jimin', 'see you soon 🥹'))] },
      { id: 'thanks', triggers: [/\b(thanks|thank you|thx|ty|appreciated)\b/], replies: [
        seq(M('rm', 'anytime. truly'), M('jimin', 'you are too sweet')),
        seq(M('jhope', 'ahaha you are welcome!!'), M('suga', "don't mention it. really, don't")),
        seq(M('jin', 'my pleasure, i accept compliments in dumplings'))] },
      { id: 'how', priority: 1, triggers: [/\bhow are you\b/, /\bwhat'?s up\b/, /\bhow'?s it going\b/, /\bhow are things\b/], replies: [
        seq(M('jin', "doing great. i've been cooking all day"), M('suga', 'tired. but good')),
        seq(M('jhope', 'excellent!! ahaha how about you? how are YOU feeling?'), M('jimin', 'i am okay. better now that you asked 🥹')),
        seq(M('v', 'i have been looking at the snow for 3 hours. it is going well'), M('rm', 'i lost my keys. otherwise fine'))] },
      { id: 'plans', triggers: [/\b(plans?|tomorrow|tonight|party|weekend|new year)\b/], replies: [
        seq(M('jhope', 'plan: tree, food, photo, repeat ahaha'), M('rm', 'i will add it to the spreadsheet. if i can find the spreadsheet')),
        seq(M('jimin', 'i hope you get to rest'), M('v', 'and see something pretty')),
        seq(M('jungkook', 'plan: food, then more food'), M('suga', 'plan: nap'))] },
      { id: 'coffee', triggers: [/\b(coffee|tea|latte|espresso|caffeine|matcha)\b/], replies: [
        seq(M('suga', 'coffee is a lifestyle. also a reminder to drink water'), M('jin', 'tea. with something sweet')),
        seq(M('rm', 'i drop at least one mug a week. coffee is dangerous in my hands'), M('jhope', 'ahaha ㅋㅋㅋ RM-hyung!!')),
        seq(M('v', 'tea, a quiet window, and an old song. that is the best coffee shop'))] },
      { id: 'dance', triggers: [/\b(danc\w*|choreo\w*|move|moves|groove)\b/], replies: [
        seq(M('jhope', 'DANCE?? ahaha yes, show me the move!!'), M('jungkook', 'i will beat everyone')),
        seq(M('jimin', 'soft dancing in the kitchen is the best kind'), M('jin', 'i have a very dramatic move')),
        seq(M('suga', 'i dance in my head. it is a very good show'))] },
      { id: 'movie', triggers: [/\b(movies?|film|films|watch\w*|netflix|series|drama)\b/], replies: [
        seq(M('v', 'a movie in a dim room, with snow outside. that is perfect'), M('jimin', 'i will make popcorn 🥹')),
        seq(M('jungkook', 'action!! or comedy!! with snacks!!'), M('suga', 'i choose the movie. that is final')),
        seq(M('rm', 'i like quiet movies that make me think. then i fall asleep'))] },
      { id: 'compliment', priority: 1, triggers: [/\b(pretty|cute|handsome|beautiful|gorgeous|amazing|awesome|best)\b/], replies: [
        seq(M('jin', 'WORLDWIDE HANDSOME?', 'oh. you meant someone else', 'it is also me'), M('suga', 'it is not you')),
        seq(M('jimin', 'aww. you are too kind 🥹'), M('jungkook', 'say it again, i will remember it')),
        seq(M('jhope', 'ahaha thank you!! you light up the chat too'), M('rm', 'kindness like that goes a long way'))] },
      { id: 'sorry', triggers: [/\b(sorry|apologi[sz]e|my bad|forgive)\b/], replies: [
        seq(M('rm', "nothing to apologise for. you're good"), M('jimin', 'it is okay, really 🥹')),
        seq(M('jhope', 'ahaha no sorry needed!! all good!!'), M('suga', 'it is fine')),
        seq(M('jin', 'apology accepted, with dumplings'), M('v', 'it is already forgotten, like a snowflake'))] },
      { id: 'happy', priority: 1, triggers: [/\b(happy|excited|yay|great|awesome|good news|wonderful|best day)\b/], replies: [
        seq(M('jhope', 'YESSS!! ahaha ㅋㅋㅋ tell me everything!!'), M('jimin', 'i love hearing that 🥹')),
        seq(M('jungkook', 'that is so good!! let us celebrate with food!!'), M('jin', 'dessert is already on the table')),
        seq(M('v', 'this is the kind of news that glows. i love it'), M('rm', 'i am glad. truly'))] },
      { id: 'bored', triggers: [/\b(bored|boring|nothing to do)\b/], replies: [
        seq(M('v', 'random question: if you could live inside a snow globe, what would be in it?'), M('jhope', 'ahaha ㅋㅋㅋ V!!')),
        seq(M('jungkook', 'game? challenge? snack contest?'), M('jin', 'i can tell you a joke', 'actually, no, i will tell it anyway')),
        seq(M('jimin', 'we can chat about anything. what is on your mind?'))] },
      { id: 'family', triggers: [/\b(family|mom|mum|dad|parents|sister|brother|home|grandma|grandmother|grandpa)\b/], replies: [
        seq(M('jin', 'family dinner is the best part of any holiday', 'tell them you love them. and eat'), M('jimin', 'say hi to them from us 🥹')),
        seq(M('rm', 'time with family is a gift. even the noisy parts'), M('jhope', 'ahaha especially the noisy parts!!')),
        seq(M('suga', 'call them. even briefly. they like it'), M('v', 'warm houses, old stories. that is what Christmas is for'))] },
      { id: 'photo', triggers: [/\b(photos?|pictures?|selfies?|camera|snapshot)\b/], replies: [
        seq(M('jimin', 'photos!! send one!! i will keep it'), M('v', 'i have 400 photos of one street lamp')),
        seq(M('jungkook', 'i take the best photos. ask anyone'), M('jin', 'i take the most handsome ones')),
        seq(M('jhope', 'group photo in front of the tree!! ahaha red and green!!'))] },
      { id: 'wish', priority: 1, triggers: [/\b(wish|wishes|resolution|resolutions|hope|hopes|dream|dreams)\b/], replies: [
        seq(M('rm', 'my wish is that you are okay. just okay is already a lot'), M('jhope', 'mine too!! ahaha and for lots of laughs')),
        seq(M('v', 'i wish for snow, and for everyone to look up at least once'), M('suga', 'i wish for nothing. fine, for sleep')),
        seq(M('jimin', 'i hope the new year is gentle with you 🥹'), M('jungkook', 'and full of snacks'))] },
      { id: 'weather', triggers: [/\b(rain\w*|raining|storm|wind\w*|weather|sunny|cloudy|fog\w*)\b/], replies: [
        seq(M('v', 'rain at night is the best kind of white noise'), M('suga', 'stay inside. it is a good excuse')),
        seq(M('jhope', 'weather is a mood!! ahaha how is your mood?'), M('rm', 'take an umbrella. i always forget mine')),
        seq(M('jimin', 'stay warm and dry 🥹'), M('jungkook', 'bad weather means hot food and games'))] },
      { id: 'tease', triggers: [/\b(burn\w*|burnt|oops|dropped|lost|forgot|forgotten|misplaced)\b/], replies: [
        seq(M('rm', 'i know that feeling very well', 'my keys and i are not on speaking terms'), M('suga', 'he lost them again')),
        seq(M('jin', 'my caramel is burnt. it is a *rustic* caramel'), M('jimin', 'hyung, it is black')),
        seq(M('jhope', 'ahaha ㅋㅋㅋ it happens!! we fix it together'))] }
    ],

    fallbacks: [
      [L('jin', 'hmm? say that again, i was stirring the pot')],
      [L('jimin', 'tell us more 🥹')],
      [L('v', 'i love that for you. also, random question: what is your favorite cloud?')],
      [L('rm', 'interesting. go on'), L('suga', 'yeah. we are listening')],
      [L('jhope', 'okay okay okay!! ahaha how are you feeling right now?')],
      [L('suga', '...sure'), L('jungkook', 'he means he likes it')],
      [L('jungkook', 'i am here!! is there food in this story?')],
      [L('rm', 'i lost the thread. it is a small thread. continue')]
    ],

    suggestions: ['Merry Christmas! 🎄', "I'm hungry 🍜", 'Tell me a dad joke', 'Play a winter song ❄️', "I'm so tired 😴", 'Tell Suga hi', 'I need a hug', 'Any gift ideas? 🎁', 'Good night', 'Love you all 💜'],

    // shown when she returns after 4+ hours (time-of-day aware)
    welcomeBack: {
      morning: [[L('jin', 'good morning. breakfast first, chat later')], [L('suga', 'morning. eat something'), L('jhope', 'ahaha you are back!!')]],
      afternoon: [[L('jhope', 'you are back!! perfect timing ahaha')], [L('jungkook', 'did you eat lunch?? i ate two')]],
      evening: [[L('v', 'evening. the sky is doing the blue thing again')], [L('jimin', 'welcome back. how was your day? 🥹')]],
      night: [[L('suga', "it's late. you should sleep. ...but hi")], [L('rm', "hey. i'm up too. no pressure")]]
    }
  };
})();
