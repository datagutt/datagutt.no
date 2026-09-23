// Liv, post office: contact and socials.
=== postmaster ===
{ postmaster > 1:
    {~Letters for Thomas go in the red box.|Stamps? We have stamps. Not the passport kind, mind.|The post never sleeps. I do, though.}
- else:
    Welcome to the post office. # nod
    Thomas left a note at the counter: "{profile("contactPitch")}"
}
- (topics)
* [Can I send Thomas a letter?]
    Of course. His address is {profile("email")}. # link: email
    -> topics
* [Where else can I find him?]
    The noticeboard has everything. Pick one.
    -> board
+ [That's all, thanks.]
    Have a nice day! Mind the ferry, it's late.
    -> END

= board
+ [GitHub]
    Where the code lives. # link: social github
    -> board
+ [Bluesky]
    Short posts about building things. # link: social bluesky
    -> board
+ [X]
    Still there, technically. # link: social x
    -> board
+ [LinkedIn]
    The respectable one. # link: social linkedin
    -> board
+ [Instagram]
    Photos. Some of the fjord. # link: social instagram
    -> board
+ [Twitch]
    Streams, sometimes. # link: social twitch
    -> board
+ [Back to the counter.]
    -> topics
