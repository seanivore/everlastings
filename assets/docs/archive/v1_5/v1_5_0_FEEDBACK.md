# Feedback

I reviewed both the `assets/docs/archive/v1_5/v1_5_0_IMPLEMENT.md` and then the `assets/docs/archive/v1_5/v1_5_0_BUILD_STORE_MGMT.md` documents and I just have a few thoughts. The only modifications of the file are the auto-update of the chart layouts. Find them all `assets/docs/archive/v1_5/v1_5_0_FEEDBACK.md` and let's have those drive v1.5.1 documents.

## Markdown Tangent 

Quick tangent about chart layouts that I think we should add to the `.agent/DEV_PLAN.md` and then if possible to save memories globally this would be a good one, but if you check out this image: 

`assets/docs/archive/images/20260505-markdown-chart.jpg`

This happens on more than 50% of the first edition of new markdown documents. I think there might be something, somewhere about how much I like charts that the agents are pulling from. One of the gap reviewers last session offered they create one to add on their feedback document after the fact in a way that was very much like, "hmm okay you are definitely referencing details about 'my preferences' somewhere that I am not able to pinpoint." When the charts are super small and I can easily identify how I could pull out data that can be placed as bullet point notes for each row item below the chart, then I'll usually just update it quick myself. Other times, if the document is very much about presenting information to humans, then I'll tell the agent that a column on the chart is too wide and is making all the rows wrap making it unreadable. Now, idk if it matters for agents, like if charts like this are still helpful, or rather more helpful, than details formatted differently or not. If it is a build document or something pretty specifically a document meant for an agent, then NBD to leave charts like this, if it is still a more effective way to convey information to agents. If it isn't more helpful than differently formatted information for agents OR if the document is intended for humans to review, I would like a clear rule or guideline somewhere that attempts to prevent agents from creating charts with wide columns from the start. That would be amazing for me and help prevent a lot of back and forth work. As you can see from the image it is a bit subjective, but generally if the max width for an entire chart is 100 columns wide, a figure that I'm getting from the IDE editor telling me the number of lines and columns on a page or selected, then things don't wrap. So there can be whatever number of chart columns, and they can all be any width needed, as long as the total number of chart columns is no more than 100 markdown mono font text/character count wide. That width also pastes nicely into my 'Thot' app, too, pretty perfectly. Anyway, that's the tangent, back to feedback. 

## Gap Review Flow

For the 'holistic' review or whatever we want to call it, my thoughts were that when planning the initial build document and GPT reviewed with lots of great feedback, it was just like the A-type reviewer because it didn't have access to any files other than what I uploaded which was usually just the EVERLASTINGS_STORE.md and the latest IMPLEMENT.md, and then given it had a high level understanding of all the end requirements and functionality of the site, it was able to make sure we weren't overlooking any aspects of making sure that functionality worked. 

So IDK if maybe we just want to have it be the A-type instead of creating a D-type or not, up to you there, but I do think that this gap review should probably happen and get folded in before the other reviews because if it does identify bigger picture functionality needs. Like, for example, like if we forgot for there to be a 'Page Status' value on the /admin page for all the products, or when Custom GPT calls for a list of the products for the user, that showed "draft" versus "live" — then we'd want to get that feedback, and have the time to detail the technical side of the functionality into a new version of the IMPLEMENT.md document, so that the B-type and C-type gap reviewers can be tapped more efficiently. Depending on how much the A-type finds, we might want to fold their findings in, then run another A-type gap review, making sure that the gap reviews from that perspective are complete before we move on to the next type of gap reviews. Then perhaps we'll want to proceed like last time with B-type and C-type reviews, where they can both do their thing consecutively and then both of their feedback documents can be folded in at the same time. So A-type gap review gate, ran once, maybe twice, then B/C-type gap review gate, similarly ran once, maybe twice, feels like based on the the previous experience what we'll end up dealing with, not that we should hold out and limit to two max. The initial GPT reviews I keep referencing for this workflow conceptually was giving feedback on the entire website planning and it was two rounds. 

## GPT Feature List Need

On the IMPLEMENT.md, in PART 3, the note "**Backlog:** optional GPT `listProducts` read action" just makes me want to suggest that we fold this into an outline of all of the Custom GPT's functionality so that we can both make it clear that it isn't an optional function that it will need to be able to do, and that we cover all the needs and have it in a place where our gap reviewers, especially A-Type, are able to see the list and make sure, logically, we aren't overlooking anything that a user would need to be able to fully manage the site through the Custom GPT. 

## Product Page Design 

  1. Column comments in HTML that don't display on desktop view; you can see in the developer tool here, but it will also become evident in the subsequent pictures of feedback
     - `assets/docs/archive/images/20260505-product-page-column-html-comment-1-left.jpg`
     - `assets/docs/archive/images/20260505-product-page-column-html-comment-2-right.jpg`

  2. Featured image, so I'm not sure how much of this is because of the lack of page columns, but I think we want a more modern layout that people are used to where it takes up half the top of the page, so that the sticky card and details are on the right side; these to go in the left column
     - `assets/docs/archive/images/20260505-featured-product-image-1.jpg`
     - `assets/docs/archive/images/20260505-featured-product-image-2.jpg`
 
  3. Sticky card and details features section to be at top right of page; I think we probably named the card "sticky" because that way these two components in the right column will follow the user as they scroll down, keeping the BUY button in view, as they look at the rest of the elements in the left column
     - `assets/docs/archive/images/20260505-product-page-sticky-card-and-details-features-1.jpg`
     - `assets/docs/archive/images/20260505-product-page-sticky-card-and-details-features-2.jpg`

  4. In the left column, directly below the featured image and other images that can be clicked to view larger, the second element should be the "STORY CARD" — then after that we'd have other media. In these images you can see the YouTube embed but there's a note about the order of it and other media in the next note. But as you can see, the text format styling of the STORY CARD, I do like that it is a block quote, but the text is tiny. I think the story card is typically details about the product that will be longer than the bullet point features, so the font sizing should basically feel like main page text. 
     - `assets/docs/archive/images/20260505-product-page-youtube-and-story-card-1.jpg`
     - `assets/docs/archive/images/20260505-product-page-youtube-and-story-card-2.jpg`

  5. After the STORY CARD in the left column, we should put the MP4 HTML video inline next. Let's make sure that it is in a container that respects the aspect ratio of the video, unlike this image example where it seems to force the 16:9 adding black bars on the sides. If there are YouTube video embeds then they should come after any MP4 HTML video embeds.  
     - `assets/docs/archive/images/20260505-product-page-video-1.jpg`
     - `assets/docs/archive/images/20260505-product-page-video-2.jpg`

  6. These are the GIFs currently. I don't think we should use GIFs at all and instead just adapt the MP4 HTML video embed. I learned while updating my portfolio that using the simple HTML video tag embed with specifications like looping and no buttons for an MP4 video uploaded to the CDN is amazing compared to using GIFs. Though I didn't prefer it, I did use this for some of my GIFs to make them into MP4s: `ffmpeg -i input.gif -movflags +faststart -pix_fmt yuv420p output.mp4` The GIFs were all mediocre quality, SO short, and very difficult to get under 10 MB, but then I'd have higher quality, longer social media videos, that were just a few MBs.
     - `assets/docs/archive/images/20260505-product-page-gif-1.jpg`
     - `assets/docs/archive/images/20260505-product-page-gif-2.jpg`

  7. Note that it is unlikely that the client will have any YouTube embeds, but I suppose all of the media elements other than the featured images, should be optional.

  8. Other than the ordering of the elements the mobile view looks great. The text and size of the objects are fit well for mobile view, but this is where we'd only want one column, with the featured images first and the sticky card after. And obviously on mobile the sticky card doesn't need to be sticky. 

## Product Gallery Design 

This is the current state of the filter UI I mentioned earlier. You can see how they are laid out taking up the whole page, no dropdowns, no columns. I'm wondering if part of this might be for the same reason why the columns on the product page aren't working either. 

ALL PRODUCTS FILTER UI: `assets/docs/archive/images/20260505-product-gallery-filter-ui.jpg`

## 1.1 Field Taxonomy

I'm glad I went over the design of the product page elements because we definitely want to make sure the that field names we use are the same as what the client called them from the beginning. 

I think we might have doubled up on some of the elements. On the 'Sticky Card' we have the 'title'. And then there is that short line of text. The checkout_description and the description might end up being able to be the same copy, but let's keep them separate for flexibility. 

We'll have to look back at the notes from planning from the client because IDK that the story card will have a headline or if this is the same as the title on the sticky card. 

Actually I can't tell by the chart if the headline and story card are two elements or not. If not then the description might actually be the 'story card' page summary, and then we could use the shorter checkout_description for the short line of text visible under the product name. 

Basically, I think that by seeing all the elements in the image above we should be able to nail down exactly what fields we need, because the page elements were planned directly from the notes from the client. We might want to look up that document specifically. 

## Other 

Re: "1.4: add a small "Draft preview — not yet live" label in addition to the Publish button? (recommended.)" -- sure!

Re: "2.3: the hero spec (CSS vs. Hyperframe) is yours to write" -- coming soon! 

Re: "**`duration: 'once'`** on coupons — fine for one-time payments (Stripe requires a value; redemption cap + expiry are the real limiters). Confirm in Phase 11.7 / the D-review." -- sounds good. 

Re: "**`checkout_image` fallback to `thumbnail`** at publish is intentional (Em needn't supply a separate image). Keep unless Sean wants it mandatory." -- smart. 