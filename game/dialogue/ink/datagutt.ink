=== datagutt ===
{datagutt > 1: -> again}
Oh, hi! I'm {profile("firstName")}. {profile("role")} by trade, {profile("location")} by postcode.
{about(0)}
* [What are you working on?]
    Right now? This town. {project_desc("portfolio")}, except you can walk around in it.
    The little model on the table is the whole town. You're standing in it, which makes this a bit meta.
* [What do you mostly use?]
    {about(1)}
- Have a look around. Everyone here knows something about me, which is a little embarrassing.
-> END

= again
{~Back already? The town isn't that big. Yet.|If you find a bug, it's a feature. Probably.|I'd offer you coffee, but the greybox doesn't have any.}
-> END
