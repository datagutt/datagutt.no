// Ida, office: Nettbureau.
=== coworker ===
{ coworker > 1:
    {~Still here? He's probably off building a town again.|Stand-up is at nine. You're not invited, sorry.|He's never once used the coffee machine. He brings his own cans. Like a grown man.}
- else:
    Looking for Thomas? He works here with us at {job_company("nettbureau")}. # nod
}
- (topics)
* [What does he do here?] -> answer_1 ->
    -> topics
* [What do you work with?] -> answer_2 ->
    -> topics
+ {CHOICE_COUNT() == 0} [Can I ask you something again?] -> again
+ [I'll let you work.] -> goodbye

// Everything asked: ask any question again.
= again
+ [What does he do here?] -> answer_1 -> again
+ [What do you work with?] -> answer_2 -> again
+ [I'll let you work.] -> goodbye

= answer_1
    {job_role("nettbureau")}, {job_period("nettbureau")}.
    {job_desc("nettbureau")}
    ->->

= answer_2
    {job_tech("nettbureau")}.
    ->->

= goodbye
    Appreciated. Tell him his energy drink cans are still on his desk. All of them.
    -> END
