// Kjell, radio tower: IRLServer.
=== technician ===
{ technician > 1:
    {~Five bars. Beautiful.|The tower hums when it's happy. It's humming.|Still here? Mind the cables.}
- else:
    Careful with the cables. They're bonded. # nod
    I look after the tower for {project_name("irlserver")}.
}
- (topics)
* [What's {project_name("irlserver")}?] -> answer_1 ->
    -> topics
* [Bonded?] -> answer_2 ->
    -> topics
* [What runs up there?] -> answer_3 ->
    -> topics
* [Where can I read more?] -> answer_4 ->
    -> topics
+ {CHOICE_COUNT() == 0} [Can I ask you something again?] -> again
+ [Thanks, Kjell.] -> goodbye

// Everything asked: ask any question again.
= again
+ [What's {project_name("irlserver")}?] -> answer_1 -> again
+ [Bonded?] -> answer_2 -> again
+ [What runs up there?] -> answer_3 -> again
+ [Where can I read more?] -> answer_4 -> again
+ [Thanks, Kjell.] -> goodbye

= answer_1
    {project_desc("irlserver")}
    ->->

= answer_2
    Think of it as rope. One strand snaps, the others hold. Several network connections, one steady stream.
    ->->

= answer_3
    {project_tech("irlserver")}. I just keep the lights blinking.
    ->->

= answer_4
    It has its own home on the internet. # link: project irlserver
    ->->

= goodbye
    Any time. If your signal drops, stand closer to the tower. That's my professional advice.
    -> END
