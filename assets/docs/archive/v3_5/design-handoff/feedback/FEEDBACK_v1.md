Okay, hello. I used screenshots with written prose instead of the markup tool because of how mcuh there was that I wanted to do in one swoop, and because I needed to do mobile as we'll.

I reference screenshots using a relative path to a directory I added to `design-handoff/` at `assets/docs/archive/v3_5/design-handoff/feedback/v1-images/` so you might need to download those again? I'll be sure that the file names are clear and accurate across sources though. 

# 1 
So I was looking again at `controls.html` to compare and first I just want to make sure the palette is the same. For some reason it looks maybe darker or more vibrant? 
  - `controls.html` — `ccpv1-1-1.jpg`
  - PROTOTYPE — `ccpv1-1-2.jpg`

While we're here: 

  1. What is the "TEST" indicator that I've annotated with #1? Seems only relevant to this prototype, right? Or if it is supposed to show if you're on DEV or PROD then that is something we should stipulate in the handoff document to Claude Code because it will be a small functionality gap. It probably can pull straight from the URL but CC might have a more elegant and fool-proof solution.
  2. And then for annotated #1, let's be sure to give this way more space to avoid any cut-off text when it is being used if possible. On mobile it can be the full width even. Also there is something seriously off about that +NEW button with the underline and sort of not consistent spacing. Just looks unfinished. 

# 2 
Still comparing, there is something about the blending of the containers and buttons that I still find much more aesthetically appealing on `controls.html`, check it out. 
  - `controls.html` — `ccpv1-2-1.jpg`
  - PROTOTYPE — `ccpv1-2-2.jpg`

# 3 
For these little "LED" status lights: `ccpv1-3-1.jpg`
  1. Can we make them look less blurry and more realistic?
  2. Then replicate that in the tab navigation?

And then the blinking can even be more crisp and less subtle. The same colors used in the product list can be used next to the tabs (a cheater way of making sure people 100% get what means what). And I'd like to use, like we have: 
  - GREEN=LIVE
  - YELLOWISH-RED (#D95301) should be for staged changes that haven't been made live. This is similar to a draft but drafts have never been published; the difference is just so that they don't make simple changes and forget to publish them.
  - Just yellow is fine to keep for DRAFT but let's blink both; staged changes are sort of more urgent, thus the color change. 

Lastly, there are more colors out there for indicators so let's get more creative. 
  - Blue for sold (#297fb4)
  - And maybe like a purple-gray for archived (perhaps around #83718a) 

# 4 
Orders sidebar nav versus the Pieces top tab nav: `ccpv1-4-1.jpg`
  1. I love how this sidebar blinks when there is an order to attend to that hasn't been seen yet. (Please make it clear that is the case in the transfer to Claude Code document for implementation because that will be a design gap for them to fill so that it can know when it has been viewed or not)
  2. Since this "Sold" tab, though the number might be different, will also contain orders that might not have been seen yet, can we have it blink with the same subtle yellow-ish already blinking on the sidebar tab? (Though we can keep the led light the same as noted in #3 above)

Not totally related but annotated for #3: 

  3. Should we change this to just... Hmm... What is a word that would apply for any future store. Pieces kind of only applies well for this client and I'm trying to build this for future use cases too. Maybe just PRODUCT?

# 5 
Okay now digging into the various fields, toggles, etc. On a product when compact and expanded: 

**`ccpv1-5-1.jpg`**

  1. I love the green that highlights the field when you're in it. But I'm not sure what LIVE means or what it would say otherwise, like if the product is a draft then it is implied and if it is a staged change we would have that color LED light (from above) and could wrap the field in that color. Then, in any case, I think this kind of extra detail should only be shown when the user has the field in focus, just like how the green comes up, any text for context should show up. I'm not sure that the heading of the column would be the best place for it though.
  2. Then for #2 I think there is no reason we can't have a field to update the quantity as well, right?
I mentioned the blending of things above but those toggles could use some freshening up, particularly th unswitched one.

**`ccpv1-5-2.jpg`**

  3. The number of times we're showing LIVE and green here is a bit crazy making. Since the featured and live toggles are in the row still, I don't think we need them directly below again. Nor do I think we need it a third time in the green box. Same thing with the LED green light — plus "live in the shop" is already understood by the tab so that is unnecessary. Lastly here, the "changes the moment you save" is one of those notes that are like context and should only come up when the user has their cursor focused in one of those fields, or have just changed something. 
  4. For #4 I'm just noting that I feel like almost all of these are required aren't they? If you LMK where you found that we suss that out. I just can't really imagine a post that didn't have a headline or product type or series for example. 
  5. For #5 just pointing out where else to change the naming Re: 4.3 from above about Piece vs. Product vs. Other options.   
  6. For #6 the "locks after first publish" is one of those context things that can just pop up when being edited. To add urgency we can wrap the field dropdown border in the "staged changes" color or just a red. 
  7. Last for this image, #7, I'd like for these to start out about twice as tall — OR better yet, if it is possible for them to automatically grow as you add more lines that would be perfect. I've never seen a site do that so not sure if possible but I don't want scrolling inside of a text field on a page that scrolls if it can be avoided, that is just too much. 

# 6 
Okay only changing to a new heading number here to keep things clear and separate, but it is still dealing with the same product details fields. 

**`ccpv1-6-1.jpg` and `ccpv1-6-2.jpg` and `ccpv1-6-3.jpg`**

Image -1 is our prototype, -2 is our live dev website, and -3 is our live dev `/admin` panel. 

  1. Wow so glad that we have all these fields on the prototype because I remember filling them out and it made me realize that I DON'T SEE THEM ON THE ACTUAL WEBSITE PAGE (-2.jpg). Please note this in the handoff document given to Claude Code for integration because this is a gap and bug that needs to be fixed. 

     My original comment on these, for dimensions, weight, materials, features is that if possible we should have these fields validate the input to make sure it is the right format. But rather than rejecting the right format it should: A. Have a context popup next to the field label showing the format required, and B. Try to auto fix whatever is entered, the context text popup is just incase the auto formatting doesn't do it properly. That said, I wonder if dimensions needs to have WIDTH, DEPTH, HEIGHT, separate fields to make this easier on someone entering these values and needing to get the formatting consistently right. With GPT entering the information it knows to format things right so it might just be helpful here. This is something to also note for the handoff document because it would need to take in three fields and also probably need something to do with the auto formatting.

     This is one place (the dimensions and weight fields) where I think the full width possible seems unnecessary.

     When typing in MATERIALS and FEATURE fields, which also could be side by side because they are both turned into bulleted lists so it would be UX helpful to see if a line wraps in an approximate of what would probably also wrap on the page. But when entering in either field, can we have a context text helper popup next to the label saying these will be bulleted lists, and to write each item on it's own line? And then even better, can we automatically give them bullet points so it really nails in this fact?

     The other two images, -2.jpg and -3.jpg, I mentioned what they are but they're mostly for you to please hand along to Claude Code in the handoff integration document so that they can see for themselves. Please use the full relative path though when doing that.

  2. Ah and almost forgot I added this #2 annotation. This is because I don't think the sticky bar is helpful but I think we could make it helpful by the "live, drafts, sold, archived..." tabs being the thing that is sticky on the bar, not the other information. 

# 7
For `ccpv1-7-1.jpg` this is just a functionality FYI but when I tried to toggle the "Live/Available" green toggle (which the language for which we should make consistent), first the blue FEATURED toggle turned off first, leaving the green one on. Then I clicked the green again and the entry completely disappears and I can't find it anymore. I was trying to make one of them "not available" though I see the staged changes one now, because I wanted to see what the buttons were at the bottom of the expanded product editing fields to common them in the next section. 

# 8 
I have a number of notes for this 8th heading that cover the rest of the product entry page on desktop. The main image is `ccpv1-8-1.jpg` but some of the numbers, when I get to them, will reference the letters I annotated on `ccpv1-8-2.jpg`. Note that these might require notification in the integration document because I want the UX to be simplified and we might need to change up the code for that to work the way I'm about to describe. 

  1. I don't see why "upload first" and "pasted URLs are secondary" is necessary and for UX it shouldn't be, more to come on the UX for the UI flow for that in the next numbers. And "tap to open a thumb to see full asset" is just not needed as it is already implied by the icon on the square preview of the image, however for the gallery, I think we'll need that one to open to a modal that has all of the images in the same little squares with the icon showing they can expand them. That way they can do those as well.
  2. The upload button and everything is pretty, but I'd like to simplify. When they click this "Add Media" button, they should get a modal that will give them opportunity to address all media at once, and the options will change based on what has been added. Let me describe.

     There should first be a larger sized empty box that encourages click-and-drag/dropping media in, because I guess people like to do that, it is always an option. In the middle though there can be the button to upload from device ("device" because it could be from a phone's camera roll). When dropping or selecting files it should allow them to select more than one file at a time.

     Visible, not below the fold, there should be a easy to see text field for adding media using a URL. They can add a direct URL that ends in the .mp4 or .jpg, or a share link from something like Google Drive or Dropbox. Both of these are already possible so no need to explain anywhere, we covered our bases just by making it possible to do any. The user should also be able to place a YouTube URL that they want embedded.

     After submitting the batch of media uploads, dropping them in, or hitting return after placing something in the text field (all of which can be done in any order), they should show up below as they are finished loading, with a placeholder and progress bar if it is loading slowly. This column is still on the modal, and we should add details about each piece of media next to it, like what it is recognizing it as a video from the file extension, etc.

     Also next to the media, based on what type of media it is, it should offer options. For all media it there should be a required Alt Text field.

     Next to an image, they can select the role of hero, gallery, share, checkout. The counter even at this phase that updates as you progress through setting them up would be nice.

     For images, by the APPLY button, since the 'share image' and the 'checkout image' aren't necessary, it could use that nice small font but with a red X and just say that if not image is added to each role, the hero will be reused for both of them.

     NOW — to prevent the annoying UX of uploading the same image multiple times that they might want to use across roles we should have the role as checkboxes (either in line or in a dropdown) with some simple logic. Hero, share thumbnail, checkout, video still poster, and gallery images, are the types of image media. No GIFs we only take MP4 which I'll mention below.

     - Any uploaded image can get a checkmark for gallery
     - Only one can get a checkmark for hero
     - If hero is already applied to an image, it should tell them they can't add a second if they tried
     - If hero is already applied to an image, it should not let them add it as a gallery image
     - If they try to add hero to a gallery image, it should stop and ask if they rather it be the hero and that it can't be both
     - For the share thumbnail, checkout image, and a video still poster, those can be added along with any of the gallery or hero selections, or in any other collective combination of roles; the only separation between image use would be gallery and hero since they're in the same visual stack on the page

    For a YouTube URL shared, it should just tell them that it will be embedded as a youtube. The preview of the youtube embed should load and bonus points if it is playable so they can confirm it is what they wanted. If it recognizes a youtube URL that is wrong, it should tell them, and if it has a video URL to something else that is a different video hosting site, or an invalid share URL, it should tell them. 

    For video additions, both share URLs, uploads from dropping them in or the upload button, or a direct .mp4 or other video extension URL. I think it is just .mp4 but we have to confirm... Perhaps you know because these are just set up using the HTML with video tag, so if those work with other video formats then cool we should tell them if the use a wrong format. When these are added though, of course we still need the alt text. Then we need checkmark boxes for LOOP, MUTE, HIDE CONTROLS, and AUTOPLAY. This is because we do GIF-style videos this way because it is such a smaller file size and higher quality visual. 

    The above information should have also covered these indicators. Basically they will show on the modal but then don't really need to be on the page afterwards. If we do it can just be more like it is but instead of missing it would say "using hero". And of course, they can always go back in and add images. 
    
3. In fact, this whole section of thumbnails should be the area where they can edit images. For the gallery images they should be able to click and drag rearrange the order of them. There should also be little X icon at the top left of each one so they can delete it if they want. Lastly, they should be able to click the upload button -- which actually might need a better label because they should be able to click it again to open the model and then scroll back down to the column of media and change the roles is they want. Unless you can think of a cleaner way to allow for role changing, I think this makes the most sense, since they might also be adding a new image as well.

4. This is actually for number #4, #5, #6, and #7 and please see "B" on `ccpv1-8-2.jpg`. These fields should be automatically populated when "A" is entered immediately. For #4, this should populate right away when the new product is created. It can then be grayed out as always uneditable and therefore doesn't need the "locks after first publish" message because it is basically always locked and isn't something users manage.

5. For #5, there is already a script that creates the slug that GPT uses so that should be no problem. It can be based off the title but should allow for them to edit it. Instead of a lock icon with the text "locks after first publish" we can JUST use the lock icon and make it so that when on desktop the user hovers over it or clicks, a tool tip should say "Locks after first publish" and then when the tap on mobile it should do the same. Please make this the same UI UX for all "locks" fields.

6. For #6, it can again populate from the title, but be editable, and have the lock icon.

7. For #7, it should be written possibly based on a script since we don't have the AI to write a proper one, but again be editable, and have the lock icon.

   Hopefully it makes sense why all of these therefore would make more sense up where "B" is on that second image. Also because they are all short and don't need the full width of the page. And because most people won't want to type it multiple times, and if they want to perfect things, they'll at least have a starting point. Lastly I noticed there is no formal SEO description field. If we are using a different field automatically it should do the same auto-copy the text thing so they can edit it. I looked at the description field and noticed that it said "Materials and the making, in plain words." under the 'i' tool tip which we need to confirm since there is a materials section, too.

   One more to apply to **ALL FIELDS** we need to put the appropriate (for SEO) or recommended (for on page) number of characters next to the actual number of characters with spaces entered into the field so that they can manage how things look without having to bounce back and forth between the preview and editing the whole time.

8. This field is not necessary because of the media UI section.

9. For these buttons, I propose this order and layout:

   - Regarding "archive" we need to make it clear, and let this be the final word if it contradicts anything I said above: The green switch should change an available product to a DRAFT product. When the user hovers over that switch it should tell them that, and when they do it one of those pretty notifications that pop up on the bottom of the screen should pop up. However, these pop-ups are important so please move them to the top right of the screen, or top middle on mobile, and also make them so that if the user taps them or swipes them they very quickly disappear because if it hides something it might be annoying so we want to minimize that, Re: `ccpv1-8-3.jpg`
   - Instead, but still placed to that left side, a very serious button in a transparent red type container that says "ARCHIVE THIS PRODUCT" — when they hover they get a tool tip that lets them know it isn't permanent ever, and maybe even that they can simply make it a draft using the green available toggle.
   - Then on the right side in one row, first a SAVE button. We need to make sure that things are AUTO SAVING while they edit an entry by default (add to integration document), which means that this button actually saves again and exits the view taking them back to the all products view.
   - To the right, in the middle of the three buttons here, is the eye icon for preview, but on a button that fits it this time. No need for text because
   - On the far right, the button should say PUBLISH — but it should be grayed out if they are missing a field, which it should highlight by adding a red ring around the field for them and telling them to fix the indicated field. It also stays grayed out and unclickable because they MUST PREVIEW the page if it is new and they have not yet. There is a PUBLISH button on the preview page, just FYI, not that we need to mention that. But if this is why it is gray and unclickable we should tell them new entries must be previewed first. If it is a new post, already previewed, never published, then put the PUBLISH button in a green stroke. If it is a post that needs to have changes published then the button can just say instead PUBLISH CHANGES and it should be in the same color as the LED this type of post status gets.

# 9
I mentioned above that the sticky bar should be the tabs that I've placed an X over in this annotated image `ccpv1-9-1.jpg` — because instead, please make sure that the bar from the row view is what is sticky. This is for two reasons. First, those buttons are then accessible and won't need to be duplicated on the expanded view (and on mobile can just place it at the top as a sticky bar even though it wasn't an accordian). Second because we want the user to be able to easily exit this view. 
  - If the user clicks this bar while editing a post, it automatically saves the post as a draft (or an edit with staged changes to push if that is the case). No warning, we need this to just be a smooth UX via this UI.
  - If the user click outside the product details entry section, it also automatically saves the post and closes it without warning.
  - On mobile we have an X at the top left of the editor. 


# 10
The last of the feedback and images is from the mobile view. Please take initiative to employ all the feedback above to the mobile. Some of the annotations are just reminders of this. I'll call attention to the ones that are not and are mobile-specific here. 

**`ccpv1-10-1.jpg`**

  1. Just reminder to use up space to make these fields easy to write in without hiding text if at all possible
  2. Not sure what "PiecePrice • liveQtyAvailFeat" is for there, probably can be removed?
  3. Just "Qty." count, not a "how many left" please
  4. This is wasted space at the top, remove it completely and
  5. Instead, don't forget, we need our mobile nav here that replicates the sidebar nav on desktop which is nicely shown in `controls.html`
  6. Right and left margins are LARGE and not necessary because no one is tapping there. We used this example of the New York Times mobile view before for text size, which is still a good reminder here, but also you can see how wide (or not wide) their left and right margins are: `ccpv1-10-1-b.jpg`

**`ccpv1-10-2.jpg`**

  1. This is where the bar from the all products view of products in rows should be so we can still use those toggles and such — or actually since in mobile those toggles aren't there — boy I really wish they were — but we should put them up there since the rest of the details are on the page now.
  2. Again with the left and right margin, but way more important to have that realestate on this page
  3. And again we still need our navigation

**`ccpv1-10-3.jpg`**

  1. Same feedback as on desktop — need more space by default and they should expand with the text expanding in rows to avoid scrolling in a component on a scrolling page (and missing nav not annotated

**`ccpv1-10-4.jpg`**

  1. Just a reminder for the same treatment to the media section, this text, the UI and modal pitched, and then above those bullet point fields

**`ccpv1-10-5.jpg`**

  1. One final reminder to do the same as on desktop 
