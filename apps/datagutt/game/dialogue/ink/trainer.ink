// Tor, the gym: the tech stack, one weight rack per skill category. He lifts all of it.
=== trainer ===
{ trainer > 1:
    {~Back for another set? Respect.|Hydrate. With water. Not whatever Thomas drinks.|Full stack, full body. Same thing.}
- else:
    Welcome to the gym! This is where Thomas trains. Every rack here is part of his stack. # nod
}
- (topics)
* [The languages rack?] -> answer_1 ->
    -> topics
* [Frameworks?] -> answer_2 ->
    -> topics
* [Cloud and DevOps?] -> answer_3 ->
    -> topics
* [Everyday tools?] -> answer_4 ->
    -> topics
* [That heavy-looking rack?] -> answer_5 ->
    -> topics
* [And the front desk?] -> answer_6 ->
    -> topics
+ {CHOICE_COUNT() == 0} [Can I ask you something again?] -> again
+ [Thanks, Tor.] -> goodbye

// Everything asked: ask any question again.
= again
+ [The languages rack?] -> answer_1 -> again
+ [Frameworks?] -> answer_2 -> again
+ [Cloud and DevOps?] -> answer_3 -> again
+ [Everyday tools?] -> answer_4 -> again
+ [That heavy-looking rack?] -> answer_5 -> again
+ [And the front desk?] -> answer_6 -> again
+ [Thanks, Tor.] -> goodbye

= answer_1
    {skills("Languages")}. TypeScript is his daily lift.
    ->->

= answer_2
    {skills("Frameworks")}. Good form on all of them.
    ->->

= answer_3
    {skills("Cloud & DevOps")}. That's the endurance work.
    ->->

= answer_4
    {skills("Tools")}. Warm-up weights. He never skips them.
    ->->

= answer_5
    Video and streaming. {skills("Video & Streaming Tech")}. Heaviest lift in the building. Spot him on that one.
    ->->

= answer_6
    Payments. {skills("Payments")}. Memberships don't pay for themselves.
    ->->

= goodbye
    Go lift something. Code counts.
    -> END
