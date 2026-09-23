// Tor, the gym: the tech stack, one weight rack per skill category. He lifts all of it.
=== trainer ===
{ trainer > 1:
    {~Back for another set? Respect.|Hydrate. With water. Not whatever Thomas drinks.|Full stack, full body. Same thing.}
- else:
    Welcome to the gym! This is where Thomas trains. Every rack here is part of his stack. # nod
}
- (topics)
* [The languages rack?]
    {skills("Languages")}. TypeScript is his daily lift.
    -> topics
* [Frameworks?]
    {skills("Frameworks")}. Good form on all of them.
    -> topics
* [Cloud and DevOps?]
    {skills("Cloud & DevOps")}. That's the endurance work.
    -> topics
* [Everyday tools?]
    {skills("Tools")}. Warm-up weights. He never skips them.
    -> topics
* [That heavy-looking rack?]
    Video and streaming. {skills("Video & Streaming Tech")}. Heaviest lift in the building. Spot him on that one.
    -> topics
* [And the front desk?]
    Payments. {skills("Payments")}. Memberships don't pay for themselves.
    -> topics
+ [Thanks, Tor.]
    Go lift something. Code counts.
    -> END
