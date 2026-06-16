# Coupon GPT Chat Error Fix

## Overview 

User set up a coupon asking for "20% off for this coming weekend and today is Tuesday, June 16, 2026". User then closed the chat thread and opened a now one which proceeded like this: 

## Conversation 

### USER
  Ah can you remind me what sales are currently running or upcoming if we have any? do you need the current date? 

### AI
  No need for the date — I can check what's actually active. 😊

  Right now we have **one sale running**:

  * **ELSEWHERE20** — **20% off store-wide**

    * Applies to the whole shop
    * Has not been used yet
    * Currently set to expire on **July 21, 2026** (assuming that's the intended date from the store settings)

  I don't see any other active or scheduled discount codes at the moment. The store tools only show active promotions, so if you were planning a future seasonal sale and we never created the coupon yet, it wouldn't appear here. 

  If you'd like, I can also help you:

  * decide whether ELSEWHERE20 should stay running,
  * create a summer sale code,
  * make a coupon for a specific haven only,
  * or check whether any pieces currently have staged (unpublished) changes before a promotion goes out.

### USER
  Oh interesting. So does it really say July, not June? Because when we created that one it was supposed to be 20% off the entire store, but just this weekend. Today is the 16th of June so 19, 20, 21 is this weekend.

### AI 
  Good catch. Looking at the coupon data, the expiration is stored as a Unix timestamp. I interpreted it as July at first, but if this was meant to cover **June 19–21, 2026**, then we should verify the timestamp rather than trust my quick read.

  What I can see is:

  * Code: **ELSEWHERE20**
  * 20% off
  * Store-wide
  * 0 redemptions so far

  The expiration timestamp attached to it is `1782086400`. That timestamp is what determines whether it ends in June or July.

  Given your recollection, I suspect one of two things happened:

  1. We intended June 21 and entered the wrong month when creating it.
  2. I misread the timestamp conversion.

  I can fix it either way, but before I touch anything I'd rather verify the exact date represented by that timestamp and then compare it to what you intended. If the code is currently set to expire in July, we can either:

  * leave it as-is,
  * change it by ending this code and creating a replacement that expires June 21,
  * or create a new weekend-only code and retire this one.

  Based on your description, the intended promotion sounds like:

  * **ELSEWHERE20**
  * 20% off store-wide
  * Starts June 19, 2026
  * Ends June 21, 2026 (end of weekend)

  And yes, June 19–21 is the upcoming weekend relative to today, June 16.

### USER
  What does that timestamp say? 1782086400 is meaningless to me lol 

### AI 
  😂 Fair. A Unix timestamp is basically just "seconds since January 1, 1970."

  **1782086400 = June 22, 2026 at 12:00 AM UTC.**

  So that actually lines up very nicely with what you remember:

  * Sale runs through **Friday June 19**
  * **Saturday June 20**
  * **Sunday June 21**
  * Expires at the very start of **Monday June 22**

  In other words, **ELSEWHERE20 is currently set up exactly like a June 19–21 weekend sale**, not a July sale. I misread it earlier.

  So the good news is:

  * ✅ 20% off store-wide
  * ✅ Ends after the June 21 weekend
  * ✅ No changes needed if that's what you intended

  And apparently no one has used it yet, which means you're perfectly timed to start talking about it this week.

### USER
  Okay rad so it *IS* accurate right now. 

  More specifically, what kind of UI change would make it less or completely error proof for you? I'm setting up the next round of site updates. I think we probably could use a read-back confirmation phase, in chat, for the user to look at what you're about to set the coupon up as. That might be helpful but not necessarily for this mishap. Or I guess if I just report the details of the confusion then when in planing phase to make this more robust, we can come up with something. Like idk if anything you pull from Stripe goes through a conversion automatically or not or if it could potentially, but that was my initial thought. 

### AI
  Yes — it **is accurate right now**.

  The most error-proof UI/API improvement would be: **never make the assistant interpret raw Unix timestamps.** Return both the raw value and a human-readable date from the store layer.

  For example, `listCoupons` could return:

  ```json
  {
    "expires_at": 1782086400,
    "expires_at_display": "June 22, 2026 at 12:00 AM UTC",
    "expires_after_store_day": "June 21, 2026",
    "timezone": "America/New_York"
  }
  ```

  Even better: store/report it in Em-facing language:

  **“Ends after Sunday, June 21, 2026”**

  For coupon creation, yes, a chat read-back would help:

  “Create ELSEWHERE20: 20% off, store-wide, usable through Sunday June 21, ending automatically at midnight after the weekend?”

  But for this specific mishap, the stronger fix is on the tooling side: **convert Stripe/Unix timestamps before they reach chat**, or include a display field alongside them. Raw timestamps are where the mistake slipped in.

### USER
  When you set up the coupon, does it convert your human readable. Like the opposite direction of "The most error-proof UI/API improvement would be: never make the assistant interpret raw Unix timestamps" -- that makes a lot of sense, but how does it currently work the other way?

### AI
  Right now, when I create a coupon, I don't type a Unix timestamp directly. I take your intent ("expires June 21, 2026") and convert that into the Unix timestamp the API expects.

  So the flow today is essentially:

  **You say**

  > "20% off store-wide through June 21."

  **I reason**

  > End of June 21, 2026 → convert to timestamp

  **API receives**

  ```json
  {
    "type": "percent",
    "value": 20,
    "code": "ELSEWHERE20",
    "expires_at": 1782086400
  }
  ```

  **Stripe stores**

  > 1782086400

  Then later, when I ask what's active, I get back:

  ```json
  {
    "code": "ELSEWHERE20",
    "expires_at": 1782086400
  }
  ```

  and I have to convert it back into a calendar date.

  So there are **two conversions**:

  1. Human date → timestamp (when creating)
  2. Timestamp → human date (when reading)

  The first conversion is actually much safer because it's driven by your explicit instructions and I can sanity-check it before submitting. The second conversion is where mistakes are more likely because now I'm interpreting a number with no context.

  The strongest design improvement would be for the coupon API to accept and return both:

  ```json
  {
    "expires_at": 1782086400,
    "expires_at_display": "2026-06-22T00:00:00Z"
  }
  ```

  or even:

  ```json
  {
    "expires_on": "2026-06-21",
    "expires_at": 1782086400
  }
  ```

  Then I never have to mentally decode the timestamp at all.

  There's another subtle improvement I'd make specifically for you: **store the original human intent alongside the coupon.**

  Something like:

  ```json
  {
    "code": "ELSEWHERE20",
    "percent_off": 20,
    "campaign_note": "Summer Solstice Weekend Sale",
    "intended_dates": "June 19–21, 2026"
  }
  ```

  Then when you ask six months later, I can say:

  > "ELSEWHERE20 is the Summer Solstice Weekend Sale, intended to run June 19–21."

  That's much closer to how humans remember promotions than timestamps or even exact expiration datetimes.

  So if you're planning the next round of site updates, my priority list would be:

  1. **Return human-readable dates from the API** (biggest win).
  2. **Accept human-readable dates in the API** (less room for timezone mistakes).
  3. **Store an optional campaign name/notes field** ("Summer Solstice Weekend Sale").
  4. **Show a read-back confirmation before creation** ("20% off store-wide, June 19–21, expires midnight after June 21").

  The first one alone would have prevented this exact confusion. The fourth one would have prevented an actual misconfigured coupon if there had been one.

### USER
  Great -- if you could please for me just provide a detailed account of our exchange for this entire thread just now? I basically want to have something that give them the full context but just slightly nicer than if I was to just copy and paste everything directly from the UI of this web chat thread. Is that possible? 

### AI
  Absolutely. Here's a clean handoff you could drop into a planning ticket, GitHub issue, Notion doc, or send directly to Sean.

    # Coupon Expiration UX / API Discussion

    ## Context

    I asked The Sunkeeper what sales were currently active in the store.

    The assistant checked active coupons and reported:

    * `ELSEWHERE20`
    * 20% off
    * Store-wide
    * No redemptions yet
    * Expiration timestamp: `1782086400`

    The assistant initially interpreted that timestamp as expiring in **July 2026** and told me:

    > "Currently set to expire on July 21, 2026."

    I knew that didn't sound right because the coupon was created specifically as a **June 19–21 weekend sale**, and today's date is June 16, 2026.

    I pointed out:

    > "When we created that one it was supposed to be 20% off the entire store, but just this weekend. Today is the 16th of June so 19, 20, 21 is this weekend."

    The assistant then revisited the timestamp and converted it correctly.

    `1782086400` actually corresponds to:

    > June 22, 2026 at 12:00 AM UTC

    Which means:

    * Sale runs through June 19
    * June 20
    * June 21
    * Expires at the start of June 22

    In other words:

    **The coupon was configured correctly.**

    The error was entirely in the assistant's interpretation of the returned timestamp.

    ---

    # Root Cause

    The current coupon API returns:

    ```json
    {
      "code": "ELSEWHERE20",
      "expires_at": 1782086400
    }
    ```

    The assistant receives only a raw Unix timestamp and must convert it back into a human-readable date.

    This creates two separate date conversions in the system:

    ## Coupon Creation

    Human intent:

    > "Run through June 21"

    Assistant converts:

    ```text
    June 21, 2026
    ↓
    1782086400
    ```

    API stores timestamp.

    ## Coupon Retrieval

    API returns:

    ```text
    1782086400
    ```

    Assistant converts:

    ```text
    1782086400
    ↓
    June 22, 2026 00:00 UTC
    ```

    This second conversion is where the mistake occurred.

    ---

    # Observation

    The coupon itself was never wrong.

    The failure happened because the assistant was forced to interpret a raw timestamp rather than being given a human-readable date.

    This is the type of mistake that will occasionally happen with any AI system because:

    * timestamps are opaque
    * timezone reasoning is involved
    * expiration semantics ("through June 21" vs "expires June 22 at midnight") are not explicit

    ---

    # Proposed Improvements

    ## Priority 1: Return Human-Readable Dates

    Instead of only:

    ```json
    {
      "expires_at": 1782086400
    }
    ```

    Return:

    ```json
    {
      "expires_at": 1782086400,
      "expires_at_display": "June 22, 2026 at 12:00 AM UTC"
    }
    ```

    or

    ```json
    {
      "expires_on": "2026-06-21",
      "expires_at": 1782086400
    }
    ```

    This eliminates timestamp interpretation when reading coupons.

    ---

    ## Priority 2: Store User Intent

    Coupons are remembered by campaigns, not timestamps.

    Example:

    ```json
    {
      "code": "ELSEWHERE20",
      "campaign_name": "Summer Solstice Weekend Sale",
      "intended_dates": "June 19–21, 2026"
    }
    ```

    Then the assistant could answer:

    > ELSEWHERE20 is the Summer Solstice Weekend Sale running June 19–21.

    rather than forcing reconstruction from expiration data.

    ---

    ## Priority 3: Read-Back Confirmation During Creation

    Before creating a coupon, the assistant could present:

    > Create coupon ELSEWHERE20?
    >
    > * 20% off
    > * Store-wide
    > * Runs June 19–21, 2026
    > * Expires automatically after Sunday June 21

    Confirm?

    This catches actual configuration mistakes before they are saved.

    ---

    ## Priority 4: Return Expiration Semantics Instead of Raw Dates

    Humans think in terms like:

    > Ends after Sunday June 21

    not:

    > Expires at 2026-06-22T00:00:00Z

    An ideal API response might be:

    ```json
    {
      "expires_after_store_day": "June 21, 2026"
    }
    ```

    which directly matches the user's mental model.

    ---

    # Conclusion

    The assistant initially reported the coupon as expiring in July because it misinterpreted a raw Unix timestamp.

    After verification:

    * The coupon configuration was correct.
    * The weekend sale is correctly set to run June 19–21, 2026.
    * The underlying issue is that coupon retrieval currently requires the assistant to decode timestamps instead of receiving human-readable expiration information.

    The highest-value improvement is therefore:

    > **Return human-readable expiration dates (or expiration-day semantics) alongside timestamps in coupon API responses.**

    That change alone would have prevented this specific confusion. The read-back confirmation step would help prevent future coupon creation mistakes, but it would not have addressed this particular retrieval error.
