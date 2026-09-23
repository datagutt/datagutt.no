// Ola, farm: GitHub stats and contributions (live).
=== farmer ===
{ farmer > 1:
    {~The crops are up today.|Rain's coming. Good for the commits.|Still counting? Me too.}
- else:
    Hei! This field grows code. # nod
    Every tile is a day of Thomas's last half year, a week to a column. Taller crops, more commits.
}
- (topics)
* [How was the harvest?] -> answer_1 ->
    -> topics
* [How big is the farm?] -> answer_2 ->
    -> topics
* [How long has he been farming?] -> answer_3 ->
    -> topics
+ {CHOICE_COUNT() == 0} [Can I ask you something again?] -> again
+ [Good luck with the crops.] -> goodbye

// Everything asked: ask any question again.
= again
+ [How was the harvest?] -> answer_1 -> again
+ [How big is the farm?] -> answer_2 -> again
+ [How long has he been farming?] -> answer_3 -> again
+ [Good luck with the crops.] -> goodbye

= answer_1
    { contributions_total() > 0:
        {contributions_total()} contributions in the last year.
    - else:
        The harvest records are late this year. The Journal might have them.
    }
    ->->

= answer_2
    { stat("public_repos") > 0:
        {stat("public_repos")} public repositories, {stat("total_stars")} stars between them, and {stat("followers")} followers leaning on the fence.
    - else:
        The ledger's gone missing today. Try the Journal.
    }
    ->->

= answer_3
    {stat("years_coding")} years, give or take a winter.
    ->->

= goodbye
    Luck's got nothing to do with it. It's consistency. And whatever's in those cans Thomas drinks.
    -> END
