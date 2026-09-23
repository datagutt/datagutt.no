// Bjørn, in the town hall basement (the municipal IT department): Indre Østfold Data IKS.
=== sysadmin ===
{ sysadmin > 1:
    {~Have you tried turning it off and on again?|The server in the corner is called Fido. After my dog. Not the other way round.|Close the door behind you. The servers like it cold.}
- else:
    A visitor? Nobody comes looking for the basement. # shake
    Bjørn. I kept the municipalities' computers running for years. Young Thomas did too, once.
}
- (topics)
* [Thomas worked here?] -> answer_1 ->
    -> topics
* [What was the job like?] -> answer_2 ->
    -> topics
+ {CHOICE_COUNT() == 0} [Can I ask you something again?] -> again
+ [I'll leave you to it.] -> goodbye

// Everything asked: ask any question again.
= again
+ [Thomas worked here?] -> answer_1 -> again
+ [What was the job like?] -> answer_2 -> again
+ [I'll leave you to it.] -> goodbye

= answer_1
    At {job_company("iod")}. {job_role("iod")}, {job_period("iod")}.
    {job_desc("iod")}
    ->->

= answer_2
    {job_tech("iod")}. And printers. Nobody lists printers, but it was mostly printers.
    ->->

= goodbye
    Mind the stairs. And don't touch Fido.
    -> END
