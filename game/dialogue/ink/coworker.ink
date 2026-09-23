// Ida, office: Nettbureau.
=== coworker ===
{ coworker > 1:
    {~Still here? He's probably off building a town again.|Stand-up is at nine. You're not invited, sorry.|He's never once used the coffee machine. He brings his own cans. Like a grown man.}
- else:
    Looking for Thomas? He works here with us at {job_company("nettbureau")}. # nod
}
- (topics)
* [What does he do here?]
    {job_role("nettbureau")}, {job_period("nettbureau")}.
    {job_desc("nettbureau")}
    -> topics
* [What do you work with?]
    {job_tech("nettbureau")}.
    -> topics
+ [I'll let you work.]
    Appreciated. Tell him his energy drink cans are still on his desk. All of them.
    -> END
