// Topics pattern: every question stays on offer until asked, "See you" always ends it,
// and repeat visits greet briefly and return to whatever is still unasked. Nothing the
// visitor should learn may hide behind a one-time choice.
=== datagutt ===
{ datagutt > 1:
    {~Back already? The town isn't that big. Yet.|If you find a bug, it's a feature. Probably.|I'd offer you coffee, but the greybox doesn't have any.}
- else:
    Oh, hi! I'm {profile("firstName")}. {profile("role")} by trade, {profile("location")} by postcode.
    {about(0)}
}
- (topics)
* [What are you working on?]
    Right now? This town. {project_desc("portfolio")}, except you can walk around in it.
    The little model on the table is the whole town. You're standing in it, which makes this a bit meta.
    -> topics
* [What do you mostly use?]
    {about(1)}
    -> topics
+ [See you around.]
    Have a look around. Everyone here knows something about me, which is a little embarrassing.
    -> END
