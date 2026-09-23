// Sunniva, boathouse studio: Guac.tv.
=== streamer ===
{ streamer > 1:
    {~Chat says hi. Well, chat would, if there were a chat in the greybox.|Back for the director's cut?|Latency check: you, standing right there. Zero milliseconds. Perfect.}
- else:
    Oh! Hi chat, we have a visitor! # nod
    Welcome to the boathouse. This is where {project_name("guac")} lives.
}
- (topics)
* [What's {project_name("guac")}?]
    {project_desc("guac")}
    -> topics
* [What's it built with?]
    {project_tech("guac")}. The chat alone has more moving parts than the ferry.
    -> topics
* [Can I watch?]
    Go on, have a look. # link: project guac
    -> topics
+ [I'll let you get back to it.]
    Don't forget to like and subscribe. That's what we say. I don't know what it means either.
    -> END
