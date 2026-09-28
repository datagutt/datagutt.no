// Randi, kiosk: Donate.chat.
=== shopkeeper ===
{ shopkeeper > 1:
    {~Back for a waffle? We're out. We're always out.|The tip jar's doing well today.|Vipps accepted. Vipps is always accepted.|Thomas buys energy drinks by the crate. We had to get a second fridge.|{unlocked("passport"): Everyone's hiking up to the hytte now the trail's open. I've never sold so many Kvikk Lunsj.|Nobody's been up the mountain since the rockfall. Bad for business, that.}}
- else:
    Hei hei! Welcome to the kiosk. # nod
    See the tip jar? That's {project_name("donate-chat")}, more or less.
}
- (topics)
* [What's {project_name("donate-chat")}?] -> answer_1 ->
    -> topics
* [What does it run on?] -> answer_2 ->
    -> topics
* [Show me.] -> answer_3 ->
    -> topics
+ {CHOICE_COUNT() == 0} [Can I ask you something again?] -> again
+ [Ha det!] -> goodbye

// Everything asked: ask any question again.
= again
+ [What's {project_name("donate-chat")}?] -> answer_1 -> again
+ [What does it run on?] -> answer_2 -> again
+ [Show me.] -> answer_3 -> again
+ [Ha det!] -> goodbye

= answer_1
    {project_desc("donate-chat")}
    ->->

= answer_2
    {project_tech("donate-chat")}. I mostly care about the Vipps part.
    ->->

= answer_3
    Here you go. # link: project donate-chat
    ->->

= goodbye
    Ha det bra! Tell your streamer friends.
    -> END
