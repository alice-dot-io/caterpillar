# Security scanner research and contribution ideas

Caterpillar is useful as a lightweight first-pass scanner, but a clean result should never be read as proof that a skill is safe. Its current local checks are signature-based, so new attack patterns, concealed behavior, and instructions that are dangerous only in context can pass without a finding. This note records relevant work and proposes an incremental path that keeps findings explainable.

## What related work shows

| Project or research | Approach | What Caterpillar can learn |
| --- | --- | --- |
| [Cisco AI Defense Skill Scanner](https://github.com/cisco-ai-defense/skill-scanner) | Combines YARA-X patterns, syntax-aware checks, data-flow analysis, optional model review, and a policy layer. It can emit CI-friendly formats such as SARIF and documents the limits of each scan. | Keep rule facts and model judgments distinct, make coverage visible, and support CI output without claiming that a no-finding result means safe. |
| [Snyk ToxicSkills research](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) | Examines malicious skills and describes risks including prompt injection, credential access, unsafe downloads, and concealed payloads. It combines specialized detection policies with human validation. | Treat skill instructions, linked files, and downloaded payloads as one supply-chain story; measure candidate findings against human-reviewed benign and malicious examples. |
| [“Do Not Mention This to the User”: Detecting and Understanding Malicious Agent Skills in the Wild](https://arxiv.org/abs/2602.06547) | Studies a large skill corpus with static detection and behavioral verification, including instruction-level manipulation and concealment. | Add a safe, isolated behavior-analysis path later, because text matching alone cannot establish what an installed skill actually does. |
| [Skil security framework](https://github.com/domehahn/skil) | Proposes a vendor-neutral framework for skill security checks and machine-readable results. | Prefer stable, typed findings and interoperable output so other scanners and repositories can consume results. |

These projects solve overlapping problems with different assumptions. Caterpillar should compare methods and publish its own measured limits rather than copy a detection count or treat another tool's coverage as ground truth.

## Incremental methods

1. **Make collection and privacy behavior explicit.** Report which text files were inspected and which were skipped by size, read errors, or aggregate limits. Keep offline mode hermetic and test it with a network-call spy. These changes are implemented in this fork.
2. **Keep evidence separate from conclusions.** Preserve the rule or analyzer that produced each finding, a short evidence span, and a recommendation. When an LLM and deterministic rules disagree, show that disagreement and explain how the displayed score was calculated. The current local-AI score now applies deterministic severity deductions to merged findings; a future schema should expose each score component rather than hide the disagreement in a sentence.
3. **Add syntax-aware checks before adding more regexes.** Parse supported formats (initially shell, JavaScript/TypeScript, and Python) and flag concrete flows such as reading credential locations followed by a network request, or execution of downloaded content. Keep parser failures and unsupported languages visible as coverage gaps.
4. **Treat external content as part of the scan.** Inventory URLs, package install hooks, archives, and referenced local files. Do not automatically fetch or execute them during an ordinary scan. If a later opt-in resolver is added, use strict size and time limits, record hashes and provenance, and isolate it from user credentials.
5. **Build a versioned evaluation corpus.** Include confirmed malicious skills, benign skills that legitimately use shell/network/credential-related terms, and adversarial variants with Unicode, encoding, split strings, and indirect instructions. Record source, license, review status, and expected behavior for every case. Keep a held-out set for rule tuning.
6. **Measure what matters.** Report precision, recall, false-positive rate, false-negative rate, and coverage by attack category and file type. Include confidence intervals and the corpus version. Do not use the number of findings as a quality measure, and do not describe a clean scan as a safety guarantee.
7. **Add dynamic analysis only in a disposable sandbox.** A future runner should have no host secrets, restricted or disabled networking, resource limits, and recorded filesystem/process/network events. Analyze the skill's behavior without granting it the operator's normal shell or account access.
8. **Make findings useful to maintainers.** Add SARIF output, stable finding identifiers, path and line ranges where possible, and a baseline mode for CI. A new result should fail a build only under an explicit policy; the scanner should not silently turn uncertain model output into a hard security verdict.

## Suggested contribution sequence

- **Now:** enforce offline behavior, make scan coverage visible, and fix score composition. Add regression tests for each invariant.
- **Next:** add a documented JSON/SARIF export schema and stable rule identifiers, then create a small reviewed test corpus with false-positive cases.
- **After that:** add AST-based checks for a narrow set of languages and publish category-level evaluation results.
- **Later:** prototype behavior checks in an isolated runner, with network access and host file access disabled by default.

The immediate changes in this fork intentionally stop at deterministic, reviewable behavior. Syntax analysis, external-content resolution, and execution-based analysis need explicit boundaries and a measured corpus before they should influence a user-facing verdict.
