// Sunniva, boathouse studio: Guac.tv.
=== streamer ===
{ streamer > 1:
    {~Chat says hi. Chat is a lot, but chat means well.|Back for the director's cut?|Latency check: you, standing right there. Zero milliseconds. Perfect.}
- else:
    Oh! Hi chat, we have a visitor! # nod
    Welcome to the boathouse. This is where {project_name("guac")} lives.
}
- (topics)
* [What's {project_name("guac")}?] -> answer_1 ->
    -> topics
* [What's it built with?] -> answer_2 ->
    -> topics
* [Can I watch?] -> answer_3 ->
    -> topics
+ {CHOICE_COUNT() == 0} [Can I ask you something again?] -> again
+ [I'll let you get back to it.] -> goodbye

// Everything asked: ask any question again.
= again
+ [What's {project_name("guac")}?] -> answer_1 -> again
+ [What's it built with?] -> answer_2 -> again
+ [Can I watch?] -> answer_3 -> again
+ [I'll let you get back to it.] -> goodbye

= answer_1
    {project_desc("guac")}
    ->->

= answer_2
    {project_tech("guac")}. The chat alone has more moving parts than the ferry.
    ->->

= answer_3
    Go on, have a look. # link: project guac
    ->->

= goodbye
    Don't forget to like and subscribe. That's what we say. I don't know what it means either.
    -> END
