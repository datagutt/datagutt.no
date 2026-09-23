// Randi, kiosk: Donate.chat.
=== shopkeeper ===
{ shopkeeper > 1:
    {~Back for a waffle? We're out. We're always out.|The tip jar's doing well today.|Vipps accepted. Vipps is always accepted.|Thomas buys energy drinks by the crate. We had to get a second fridge.}
- else:
    Hei hei! Welcome to the kiosk. # nod
    See the tip jar? That's {project_name("donate-chat")}, more or less.
}
- (topics)
* [What's {project_name("donate-chat")}?]
    {project_desc("donate-chat")}
    -> topics
* [What does it run on?]
    {project_tech("donate-chat")}. I mostly care about the Vipps part.
    -> topics
* [Show me.]
    Here you go. # link: project donate-chat
    -> topics
+ [Ha det!]
    Ha det bra! Tell your streamer friends.
    -> END
