# Driving v4.0.9 Bug Report

## Summary 

This covers a refund gap "bug" as well as some other UX uncomfortabilities. 

To use *Claude Design* for admin panel debugging and UI design updates we should gather a batch of items for them to work on in a single session. Right before they begin they'll make copies of our `admin/` directory and create static data inputs so that we can make changes to files that are a 1:1 synced match. After CD is complete, any changed files will be returned to a Claude Code agent along with a changelog for an agent to review the files, line by line, ensuring no touchpoints or anything else that could have caused a bug has been disturbed, and everything is properly wired up to the backend. 

Items that are exclusively from files in the `admin/` directory can just be flagged for me to send over to Claude Design. Any that are partially in the directory should be provided in a documented and self contained way that allows for delivery to CD for editing of any files in `admin/` only, so that those files can then be returned to you here in Claude Code and easily unpackaged and applied to the current build. With the packaging please create a `assets/docs/archive/v4_0/v4_0_9_CD_HANDOFF.md` that includes all the necessary details for CD to understand the plan. Let's address as much of the below as we can first, then hand what we have for CD off. Make sure it describes what we get back so that it can be integrated easily into this build. 

## Refund Gap

I opened this purchase and thought I was refunding to create a return of *both* items, but because there was only an opt in option to return the product to the shop, and because I didn't want to provide a full refund, the system assumed I didn't want to refund both items. 

This matters because it creates a lingering order from a purchase in the shipping section, that does not need to be shipped any longer. It was "returned" and refunded, but had nowhere to go because Stripe allowing for partial refunded amounts didn't provide any indication of what happened to the purchase. 

See UI image of current state: `assets/docs/archive/images/v4-site-two-purchase-refund-gap.jpg`

This can be fixed easily. We just need to add a specific checkmark or switch or whatever kind of opt in option, much like the option to re-list an item in a store, on the UI that denotes exactly which products of any purchase are being refunded when we use this refund flow but decide not to refund a full amount. 

See UI image of current switch for re-listing an item: `assets/docs/archive/images/v4-site-two-purchase-refund-gap-2.jpg`

This clears up any ambiguity about what happens to items that get lost when there is more than one product on a single purchase, and like the first screenshot for example, I kept a $47 restocking fee. 

Or actually, maybe it is "RETURNED" ... "Returned or refunded" the toggle should probably say both in one switch just to cover all circumstances. Because I refunded this return but didn't restock it, if we had this extra toggle, the site could no that it was no longer relevant to keep in the Orders "Unfulfilled" tab. The order can simple be fully marked refunded and then moved to the "All" tab. 

## Media Layout Design 

### New Product Preview

We **seriously** need to clear up the aspect ratios and naming for "Thumbnail" images vs. "Social" images vs. "OG images".

When I've been pushing the need for a "thumbnail" image, this is the SEO thumbnail image. A 16:9 is fine, but technically Facebook and Twitter used to call for exactly 1200px x 630px. 

Because I've seen these listed at the top of HTML pages in the code along with Twitter "OG" images, I just assumed that "OG image" was a term used for the twitter image as well. 

To make things more confusing, we use the term "Social" image when you're in the dashboard of the admin panel uploading images and choosing their roles. In this case I assumed it was a User friendly way to say "the image that comes up with you share the link on Google, social media, or other places like the Messages App that will pull up the headline (SEO Title) and occasionally a small (SEO) description."

I had hoped that by being technical and using the term we used all through my social media career — that is, tying the thumbnail to the SEO needs, and calling it a thumbnail image, as that is what we called it when we created a "link share" type of post on Facebook (as compared to an Image Post or Video Post). 

This additional "OG" is at the very least, confusing to users when we used it no where else, we have a thumbnail as well, and it just isn't an image role we call for in the media uploader. 

Visual of the issue in the wild, on the preview bar for a page that you're reviewing to be published, here: `assets/docs/archive/images/v4-product-preview-media-1.jpg`

Scratch the above. Even more confusingly, on the media uploader it is simply called a "Share Image" and you can see that UI here: `assets/docs/archive/images/v4-product-preview-media-2.jpg`

I thought share, social, thumbnail, seo image, and OG image were all the same thing, until that first screenshot that lists the OG image as 4:5 aspect ratio. Now that just makes me clueless, aside from the fact that I'm certain we don't suddenly need this new role. 

We need to use strictly one type of language. I'd vote for social share image, or social thumbnail image. I lean towards thumbnail because that is what helps people to understand, especially in this set of images, that it is the only one that is actually NOT cropped to 4:5 like the hero and gallery images, and it needs to be landscape. 

Meaning the preview page is probably a mix-up where a non-existent additional photo role type was added. 

### Helpful Fallback UX

However, this brings up one other point. We turned off the thumbnail "fallback" image from a hero because I learned that it was not going to be run through the cloudinary flow to be properly cropped for a thumbnail, which means it isn't a very helpful fallback. This is fine — they can still be lazy and force cloudinary to crop a different image into landscape even though it was probably picked to be 4:5

At least, that is what I thought, until I started to wonder if when you apply the thumbnail role button/toggle ("share" image) it probably doesn't run the image through Cloudinary another time to get the proper orientation anyway. 

I'm not horribly against setting thumbnails as the wrong aspect ratio. It doesn't completely run the experience. But I am completely against setting up these seemingly "HELPFUL" little UX tricks if they are not doing things properly. 

When inspecting these tools it will be important to understand when exactly the cloudinary workflow is called. Ideally, it should NOT happen until the roles are selected and "Apply" is submitted. We need to seriously look into that because the interface does NOT feel like it isn't using the Upload endpoint until *after* you add the images to the modal, because these crazy little loading bars rather violently move from left to right across the Media modal preview images anywhere between 3 to 6 times before you can see any of the preview images. This *seems* like it is running the upload endpoint before the roles are even selected. But how could that be the case unless someone got even more lazy than these entire two sections implied and defaulted every image to 4:5 — I hope not. Perhaps not because, while the video does load in the modal with the looping GIF-like settings already preselected, presumably if I changed them this would change how it is displayed on the page. Though I guess that could all be done after the upload endpoint. 

Here is how this should work: 

  - The images should upload and be stated in the modal
  - The image cannot yet be uploaded to the endpoint
  - The user applies the roles they want to each image
  - Then, based on the image role, the images are sent to the endpoint so they can be edited, cropped down to the size their role comes from

The only reason I am so very confused and think maybe this does happen afterwards, is because in the previous sections screenshot of the preview images when reviewing a page to publish, there *IS* a landscape cropped thumbnail image. 

Anyway, as long as we get it set up to work like I defined in the bullet points above, then we can also still work with the flexibility of allowing users to add the "thumbnail" ("share") image role to an image that is also gallery or hero. In these cases the code must send that image through two different times, saving them with different file names according to their role and slug. That way the same image can first be sent to be cropped for a hero at 4:5 aspect ratio, and then another copy of that same image can be sent through separately *distinctly not* an additional crop down on top of a 4:5 aspect ratio image, for it to be edited to a 16:9 aspect ratio (ignore that I mentioned 1200px x 630 px or we'll get things even more confused).

Let's see what the current state is and then fix accordingly. 

### Media Modal Previews & Filenames

I've circled a few of the preview images provided after an image is uploaded to the media modal here: `assets/docs/archive/images/v4-media-modal-previews-1.jpg`

When the user uploads a batch of media at once, there needs to be some way of identifying which was which. (Sidebar: Facebook used to have this awesome desktop tooltip that when you hovered over any images it would show you a decent 800px square enlargement of it). I do this through cropping ahead of time or by file names, because I cannot see what is in the tiny thumbnail images after they're uploaded. 

However, these thumbnail previews of each piece of media are ALL SQUARE. We need them to respect the aspect ratio of the piece of media uploaded, for every upload, no matter what it was. 

We can also help out another way. Currently, when you upload an image it just gives itself an "Image  #" name until you give it a role and then it updates to that. 

Instead, we should preview a good chunk of the file name to help users identify which of all these tiny preview thumbnails was the hero I wanted to use. I say "good chunk" because we should be classy with it an show pretty much the same length of file name for all of the uploads. Though ideally with the file extension before going through the upload end point, that could help as well.

### Media Uploaded Display 

When creating a page, the media layout, after uploading images, extends far past the VW when on mobile. 

Visible in screenshot: `assets/docs/archive/images/v4-store-product-mobile-view-media-out-of-frame.jpg`

## Preview To Publish 

Speaking to the UI/UX when using the admin dashboard, the "you must preview the image before you can publish it" is intended *ONLY* for the first time the product is being published. If there are any updates that were made that must be confirmed afterwards, then all that they need to do is open the accordion in the products section in the dashboard, and hit the PUBLISH button again. 

Further, we need to investigate what exactly requires these confirmations to review before publishing again. The one product I simply switched from "not featured" to "featured" and nothing else, and I made me review the changes. It is a toggle that I don't even need to expand the accordion to change on the post. We must be logical about these things based on the placement of the UI. 

Lastly, if I have the accordion open and am editing the headline, then that suffices as my review before publishing again. The user does not need to leave the product and come back to the staged changes and then publish. The publish button my already be available. This is sensible because the tool must recognize that the user is in the actual dashboard with the accordion open — the most solid way to make edits, and so all edits are "confirmed" as they are made. The user must simply hit PUBLISH UPDATES at the bottom after changing the copy. 

These things should greatly help to make the UX of the dashboard less cumbersome and more intuitive. 

## Admin Dash Product Creation  

The auto-prepared product fields need these fields to actually be helpful for users. This means they have to be able to get the generated materials while they're creating the post so that they can edit them and even just understand what has been prepared and what hasn't. 

Some or many of these items might be relevant only to the admin dashboard and not the ChatGPT experience. 

There are specifics about the logic of when different fields are editable until, when they are generated if auto-generated, when they lock, when they auto populate from other imagery, etc. This should all have been written in the IMPLEMENT.md from this build or maybe the design addendum. We should find that as well as anything else that might not have been perfected in these very carefully planned specifics for the behavior of these values, particularly for the admin dashboard. I've tried to write them from memory but I remember the planning agent making a big deal about getting it all right so it must be in there and it might have just gotten neglected because these are items created by Claude Design. 

  - SKU field's "LOCK" when you hover says "Locks after first publish" and should instead say "Created automatically; cannot be edited"
  - Slug field is missing a "LOCK" and should say "Locks after publish"
  - The i information notes that auto-fill don't need to say "if left blank" because this is a UX helper; an ideal user will see the populated text and then edit it after
  - The i information notes have a million m-dashes and it is just obnoxious; these should all be very simple and concise and direct
  - The "Schedule publish" option is available even after the product is published which doesn't make sense 

  1. New product created
  2. Price is created
     - We need this field to glow the same color as the other required fields before they are typed into, particularly because it is easily missed
  4. Title is added
  5. User clicks out of the title field and the following should be immediately generated but still editable by the user until published:
     - Slug
     - Checkout name
     - Checkout description
  6. Headline, collection, product, story card, description added
  7. User clicks out of the description field and these should be immediately generated but still editable by the user:
     - SEO Title
     - SEO Description
  8. User fills out dimensions
     - We need this field to glow the same color as the other required fields before they are typed into
     - The little i info viewer should remind the user that they need to add "inches" or the symbol " for inches, or add "feet" or the symbol ' for feet
  9. User fills out weight
  10. User fills out materials, features, care instructions, shipping details
      - All STAY RED after entering text
      - This is the red that all required fields start out with but should lose the color after text is added and the user first clicks away
  11. User adds media
      - When uploading the images the "loading" bar on each image square is chaotic and not smooth at all
      - When you click apply it takes really long and it makes you not sure if it is working; can we have some kind of indicator that shows it is thinking
  12. User saves or previews
      - The auto generated fields left blank, filled in earlier as above, need to be seen in this view: `assets/docs/archive/images/v4-preview-page-top-bar-missing-text.jpg`
  13. User publishes
      - All of the locks that show up later, should be present the entire time to really be helpful so they know to fill it in earlier — most of them don't show up until after publish 
---