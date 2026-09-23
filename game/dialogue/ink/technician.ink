// Kjell, radio tower: IRLServer.
=== technician ===
{ technician > 1:
    {~Five bars. Beautiful.|The tower hums when it's happy. It's humming.|Still here? Mind the cables.}
- else:
    Careful with the cables. They're bonded. # nod
    I look after the tower for {project_name("irlserver")}.
}
- (topics)
* [What's {project_name("irlserver")}?]
    {project_desc("irlserver")}
    -> topics
* [Bonded?]
    Think of it as rope. One strand snaps, the others hold. Several network connections, one steady stream.
    -> topics
* [What runs up there?]
    {project_tech("irlserver")}. I just keep the lights blinking.
    -> topics
* [Where can I read more?]
    It has its own home on the internet. # link: project irlserver
    -> topics
+ [Thanks, Kjell.]
    Any time. If your signal drops, stand closer to the tower. That's my professional advice.
    -> END
