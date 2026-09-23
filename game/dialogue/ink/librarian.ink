// Solveig, library: open source (live pinned repos).
=== librarian ===
{ librarian > 1:
    {~(Shh.) Welcome back.|(Shh.) The new books are on the front shelf.|(Shh.) Every book here is free. Forever.}
- else:
    (Shh.) Welcome to the library. # nod
    Every book here is something Thomas gave away. Free to read, free to borrow, forever.
}
- (topics)
* {repo_count() > 0} [What's on the featured shelf?]
    {repo_count()} books on the featured shelf. Here they are.
    -> shelf(0)
* {repo_count() == 0} [Why is the featured shelf empty?] -> answer_1 ->
    -> topics
* [Why give it all away?] -> answer_2 ->
    -> topics
* [Is there more?] -> answer_3 ->
    -> topics
+ {CHOICE_COUNT() == 0} [Can I ask you something again?] -> again
+ [(Whisper) Thanks.] -> goodbye

// Everything asked: ask any question again.
= again
+ {repo_count() > 0} [What's on the featured shelf?] -> shelf(0)
+ {repo_count() == 0} [Why is the featured shelf empty?] -> answer_1 -> again
+ [Why give it all away?] -> answer_2 -> again
+ [Is there more?] -> answer_3 -> again
+ [(Whisper) Thanks.] -> goodbye

= answer_1
    (Shh.) The books haven't arrived today. The Journal has the full list.
    ->->

= answer_2
    Because someone gave him theirs first. That's how libraries work.
    ->->

= answer_3
    Upstairs. Well, on GitHub. Same thing. # link: social github
    ->->

= goodbye
    (Shh.) Come back any time.
    -> END

= shelf(i)
{ i >= repo_count(): -> topics }
"{repo_name(i)}". {repo_desc(i)} {repo_lang(i) != "": Written in {repo_lang(i)}.} {repo_stars(i)} {repo_stars(i) == 1: star|stars}.
-> shelf(i + 1)

// The featured shelf in the library, read as a sign: one book per pinned repo (live).
=== featured_shelf ===
{ repo_count() == 0:
    \* The featured shelf is bare today. A card says the books are "on their way".
    -> END
}
\* The featured shelf. {repo_count()} books, one for each project Thomas has pinned.
-> book(0)

= book(i)
{ i >= repo_count(): -> END }
\* "{repo_name(i)}"{repo_lang(i) != "":, bound in {repo_lang(i)}}. {repo_desc(i)}
-> book(i + 1)
