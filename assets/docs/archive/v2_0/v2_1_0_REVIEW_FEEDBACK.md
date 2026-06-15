# Testing Feedback 

## GPT Behavior 

### Preview Publish Workflow 
There are elements that the GPT writes that are not previewed on the preview page. Specifically, the proposed SEO title and SEO description. I initially though we could just have GPT provide those details with the preview link as part of the workflow, but a stronger idea would be to have the DRAFT/PREVIEW/PUBLISH banner when I'm reviewing a page to be published, have a couple cells showing those mentioned two elements as well as any others that were created but not shown to the user. That way the preview page allows the user to preview everything. I'd be able to easily copy the SEO description for example, paste it into the GPT chat with my edits, and they could easily update it. We should also preview the THUMBNAIL since that is edited in a different aspect ratio. 

## Design

### Product Page

  + `assets/docs/archive/images/v2-feedback-product-page-sizing-1.jpg`
    - This is a 2300 px wide screen view, for which things are very cramped
    - The purchase card shouldn't be so long it goes below the fold 
    - In general, all of the fonts that are secondary information can be smaller than the standard 12 pt. 
    - Our standard font could even be smaller, and the spacing
    - The story card can return to an italics it was just way tinier than normal italics originally 
    - Some specifics are numbered on the image: 
      1. There is no need for the product title to be HUGE 
         - It is larger to emphasize and call it out
         - Doesn't need to be that large to achieve these goals 
      2. Lots of spacing and content strategy for UI that can be improved here
         - "Each piece is one-of-a-kind. Availability confirmed at checkout." shouldn't take two lines. 
         - The spacing below that and above the next bit of text is excessive 
         - Start to the next section has same info "This is a one-of-a-kind piece. Love it? Get notified if someone else adds it to their cart."
      3. That next line basically restates the same thing but now with a form, this is excessive
         - This was initially being drawn attention to because the way the text and links are laid out is not right. Might be using columns? Anyway what you're seeing is when the width of the page is pulled in a tiny bit the lines of the text break up 
         - BUT now that I can see that #2 and #3 is the same text, we can optimize all of this by just having the details next to the checkbox and just one short line up under the buy now button -- it can be much tighter to that button and much smaller text that just says "Availability confirmed at checkout" with the entire line hyperlinked to those details like it is linked now 
         - The purpose of #3 and the contents of #5 also bleed into each other so I'll continue in #5 
      4. The "BUY NOW" button is the one to emphasize with the colored in button 
      5. This can be optimized for space too, this field and button 
         - So under the buy now button we have small, tight to the button, text that just says "Availability confirmed at checkout" hyperlinked 
         - Then a spacer but with much less space than currently there, we don't need that much 
         - In the email field it can just say "Email me about this piece" and on the same line as the email field the button can just have an -> in it
         - Then below the [ ] checkbox with just "Agree to terms & conditions"
    - After all of these changes it should fit into the layout shown in green directly to the left of the pink
  + `assets/docs/archive/images/v2-feedback-product-page-sizing-2.jpg`
    - This just shows the size of the other fonts referenced in the header nav or in the sub-headline
      6. These look to be about appropriate size for this section, along with the italics and some spacing adjustments to give less space on the right and less space between lines 
  + `assets/docs/archive/images/v2-feedback-product-page-sizing-3.jpg`
    7. This is just showing the details 
       - They can be WAY SMALLER font, they are super secondary
       - They should be in a TIGHT bullet point list, written to be concise 
       - the header can be smaller to 
       - This should *FEEL* like it is a part of the payment card just attached outside below it 

  + The rest of these just show how the same sections look much better when I zoom out in Chrome to 80% incase that information helps pick text sizes that are more appropriate 
    - `assets/docs/archive/images/v2-feedback-product-page-sizing-4.jpg`
    - `assets/docs/archive/images/v2-feedback-product-page-sizing-5.jpg`
    - `assets/docs/archive/images/v2-feedback-product-page-sizing-6.jpeg`

### Glow 

This on all pages we can turn off for now. I want to revisit it and focus elsewhere for now. 

### Homepage Hero 

Main consideration here is that, since the animation was AI created, I don't know how exact it is to the piece of art of the client's that it replicated. Because of this we are going to be making adjustments that move the focus away form the CONTENT of the image, and towards the EXPERIENCE of the visual FX and motion interaction. 

  1. For the text, namely the website/company name, I wonder if we could try using the "Text-to-lottie skill" I installed globally. 
  2. I'd like to create a "perspective shift" effect. It is like a simpler parallax effect. 
     - First we can zoom into the image what looks to be about 20% -- see screen shot below 
     - SEE VISUALS
       - Current: `assets/docs/archive/images/v2-feedback-homepage-hero-1.jpg`
       - Zoomed in 20% `assets/docs/archive/images/v2-feedback-homepage-hero-2.jpg`
     - We need this extra space of image so that it has more than the window shows. 
     - We can then pull in up the bottom of the window framing the window above and below 
       - ABOUT THIS MUCH: `assets/docs/archive/images/v2-feedback-homepage-hero-3.jpg`
     - **PAGE SCROLLED ALL THE WAY UP**
       - This is where it starts and the user can scroll only down 
       - The image, now larger than the gap, should have the *BOTTOM* last 10% of the image aligned with the *BOTTOM* of the window
     - **PAGE SCROLLED DOWN** 
       - So that only 1/2 of the window remains before passing out of hte top of the viewport 
       - The image, still larger than the gap, should have the *TOP* of the image aligned with the *TOP* of the window 
     - SEE VISUAL EXAMPLES
       - EXAMPLE 1 START `assets/docs/archive/images/v2-feedback-homepage-hero-example-1.jpg`
       - EXAMPLE 1 END `assets/docs/archive/images/v2-feedback-homepage-hero-example-2.jpg`
       - EXAMPLE 2 START `assets/docs/archive/images/v2-feedback-homepage-hero-example-3.jpg`
       - EXAMPLE 2 END `assets/docs/archive/images/v2-feedback-homepage-hero-example-4.jpg`
     - So when the user starts, they see mostly the top of the image, and as they scroll down the image moves a different pace as the page, creating a perspective motion, so that by the time they're looking at the bottom of the window, it is the bottom of the image
     - **DON'T OVER THINK IT**
       - The way the user feels with the page moving up and down and how they see through versus the way the page is moving and the background, it is all a lot and you just have to trust the process 
       - EXAMPLE 3 START `assets/docs/archive/images/v2-feedback-homepage-hero-example-5.jpg`
       - EXAMPLE 3 END `assets/docs/archive/images/v2-feedback-homepage-hero-example-6.jpg`
  3. Then let's move the glow effect we were building and put it right on the window edges of the hero section, under the text though 
  4. I was also thinking it might need a bit darker layer of transparent black in the whole section to make the white text pop more
  5. And was also thinking we might consider looking at the HyperFrames Skill which should be installed globally otherwise we can find it in here `.agent/HYPERFRAMES_LLM.txt` and then add FX that make the video more old school like it was taken with grainy old 35mm film. 