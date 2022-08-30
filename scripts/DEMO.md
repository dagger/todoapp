# Incremental Revolution! Let's build our own automation platform in 20mn, one artisanal script at a time

## Introduction

* Building software is fun! There is a new tool or technique to learn every week,
* Problem! requires lots of repetitive workflows
* Solution: automate our workflows with scripts
* Problem! As they grow, artisanal scripts attract technical debt
* Solution: build a scalable automation platform
* Problem! revolutions are disruptive. Scripts are frozen and stop improving; developers must learn new tools and workflows. Migration often fails.
* Solution: the last platform wasn't good enough! The NET platform will definitely kill all other platforms AND the need for artisanal scripts! (lol)
* The cycle continues, there is no way out.

Unless...

Maybe there is a way to break the cycle! Where you get your cake and eat it too.
We call this "Incremental Revolution".

-- (cloak hook)
Let me just interrupt one second.
We have a decision to make. We can take the safe route - where I talk some more. Or we can take the more risky route,
where I show you a live demo, with some unfinished code that may or may not work. This is stuff
we have not shown publicly yet. It's not yet available in Dagger, but will be in the future. It may break!
So what do you say?

(hopefully people say yes).

---

(OK let's do this)


So, Incremental Revolution.
What if we kept our artisanal scripts, but backed them with an API? Then as the scripts grow, we spin out automation logic into the API. The API grows, the scripts stay small and simple. Composition, testing and collaboration happen on the API.

That sounds nice in theory but how would it work in practice?

-- (Objection 1)
Scripts are written in all sorts of languages, to spin out all our useful automation into a unified API would require porting them all to a single language and that would not be cost-efficient. If only there was an existing technology that allowed running code from any language in a unified runtime environment, with no code modifications... Preferable one with a massive ecosystem that developers and operators are already familiar with. (lol)

Of course the answer is to run our automation pipelines in containers.

-- (Objection 2)
But wait a minute, there is another problem. Even if we can run all our automation in containers, we still need an API. And that API must be highly modular and composable. Otherwise as it grows, it will attract technical debt just like our artisanal scripts, and we will simply have moved the problem. Here too we would need a technology designed for API modularity and composition, and with a huge ecosystem to make sure there is great tooling and language support.

Luckily such a technology exists: it's called GraphQL.



Demo time!

## Demo 1: kicking the tires

## Demo 2: custom deployment pipeline from a npm script (JS)

## Demo 3: reuse the pipeline from a Magefile (Go)

(END)

---- MISC SNIPPETS
