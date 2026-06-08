# Editing Hero Video

- The image might not EXACTLY be like her miniatures, so we don't want it to be just a perfectly clean hero video like it is now.
- Idea is to make it look like old film using Hyperframe.
- Some ideas below, what handful of edits do you think we should add?
- Need a shade layer to make text on top pop without it being obvious that it has a shade layer. Black layer set to 30% to 60% opacity.

---

HyperFrames is an open-source framework that renders high-quality MP4 videos directly on your computer using web technologies like HTML, CSS, and GSAP on JavaScript. To build an "old film" look using this tech stack, you rely on the web's foundational styling capabilities mixed with timeline-driven motion philosophy. [1, 2, 3, 4]  
1. Recreate Celluloid Imperfections via CSS 
To distress your HTML elements or video frames to look like aged film, apply standard CSS filters and blending masks: 

• Color Profile: Desaturate your video using  or give it a sepia tone (). 
• Film Grain & Noise: Overlay an animated, looping CSS noise texture or semi-transparent grain PNG with  or . 
• Flicker & Jitter: Use a CSS  animation that rapidly shifts the frame opacity between  and  to emulate projector flicker, or add micro-translations using GSAP to simulate gate weaving. [5, 6]  

2. Frame Rate Stutter (Under-cranking) 
Vintage film (like 8mm, 16mm, or 1920s silent footage) wasn't shot at modern 30fps or 60fps. It typically ran around 12 to 18 frames per second. 

• Because HyperFrames utilizes code-based, seekable animations, you program your timeline keyframes to step mechanically rather than smoothly interpolating. 
• In GSAP, you can mimic this stuttered, mechanical projection cadence by applying  in your CSS timing functions (). 

3. Masking & Matte Borders 
Old film often shows sprocket holes, ragged frame lines, and hair artifacts. 

• Apply a black-and-white mask overlay of film mattes or punch holes over your layout. 
• Set the overlay div to  (if it's a white-background mask) or  (for black-background dust/scratches). 

4. Code Generation via AI 
Because HyperFrames animations are just DOM nodes, AI coding agents (like Claude, Cursor, Gemini, or Codeex) can write the entire HTML/CSS/GSAP pipeline for you. 

• Simply prompt the AI: "Create a single HTML file with a GSAP timeline that scales an image, applies a grayscale and grain filter, and stutters at 18fps using HyperFrames formatting." 
• You can clone finished setups directly from the HyperFrames Student Edition GitHub Repository to see how they manage their base timelines, registration marks, and slot durations. [2, 3]  

Would you like me to generate a specific HTML/GSAP snippet for an old film effect, or do you need help configuring the HyperFrames CLI on your machine? 
AI can make mistakes, so double-check responses

[1] https://www.youtube.com/shorts/gwJxE--IS0A
[2] https://github.com/nateherkai/hyperframes-student-kit/blob/main/MOTION_PHILOSOPHY.md
[3] https://github.com/nateherkai/hyperframes-student-kit
[4] https://github.com/heygen-com/hyperframes
[5] https://www.flexclip.com/tools/film-effects/
[6] https://www.youtube.com/watch?v=JJmM0fq7yFM
[7] https://www.youtube.com/watch?v=n-oARu-Di78
[8] https://www.youtube.com/watch?v=u4miywtyRUM
[9] https://www.youtube.com/watch?v=9j_uK2l_cU8
[10] https://www.reddit.com/r/AfterEffects/comments/1ffbxsg/how_to_achieve_this_vintage_film_damage_effect/
[11] https://www.shutterstock.com/video/clip-1012305287-re-created-film-frame-silent-movies-era-showing

