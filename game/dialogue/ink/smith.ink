// Tor, smithy: the tech stack, one rack per skill category.
=== smith ===
{ smith > 1:
    {~Right tool for the job. Always.|The forge is warm if you're cold.|Back to browse the racks?}
- else:
    Welcome to the smithy. These are Thomas's tools. I keep them sharp. # nod
}
- (topics)
* [The languages rack?]
    {skills("Languages")}. Most of his work is TypeScript.
    -> topics
* [Frameworks?]
    {skills("Frameworks")}.
    -> topics
* [Cloud and DevOps?]
    {skills("Cloud & DevOps")}.
    -> topics
* [Everyday tools?]
    {skills("Tools")}.
    -> topics
* [That heavy-looking rack?]
    Video and streaming. {skills("Video & Streaming Tech")}. Handle with care.
    -> topics
* [And by the till?]
    Payments. {skills("Payments")}. Small rack, important rack.
    -> topics
+ [Thanks, Tor.]
    Come back when something breaks. Something always breaks.
    -> END
