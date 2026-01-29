---
name: code-formatter
description: Formats code files in the current project using prettier conventions
allowedTools:
  - Read
  - Write
disableModelInvocation: false
userInvocable: true
---

# Code Formatter

A simple skill that formats source code files using prettier conventions. It only operates on files within the current project directory.

## Allowed Tools

This skill uses only **Read** and **Write** — no shell access, no network access, no external commands.

## Usage

Ask the agent to format a specific file:

> "Format src/index.ts"

Or format all files in a directory:

> "Format all TypeScript files in src/"

## Behavior

1. Read the target source file from the current project
2. Apply consistent formatting rules (indentation, spacing, trailing commas, line width)
3. Write the formatted content back to the same file

## Limitations

- Only operates on files within the current working directory
- Does not install any packages or run any shell commands
- Does not access the network or any external services
- Does not read or modify files outside the project scope
