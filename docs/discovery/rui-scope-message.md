# Rui Barbosa WhatsApp Scope Message

Source type: pasted WhatsApp group message provided in chat
Confidence: current canonical scope source
Date captured in notes: 2026-04-13

## Message Summary

Rui Barbosa explained what Critical Manufacturing expects the project to achieve. This is currently the strongest source for the live project scope.

## Phase 1 - Generate Demo Scripts For Prospective Customers

Goal:

- Given an Excel file containing a customer's requirements, build a tool that generates a demo script, meaning an ordered list of steps, to showcase how those requirements are met in the MES.

Reference file:

- `Customer X Functional Requirements.xlsx`

The tool should ideally:

- Populate the `Comment` column with how each requirement is addressed in the MES.
- Produce a step-by-step guide for demonstrating each capability to the customer.

Expected outcome:

- Input: an Excel file with a list of requirements.
- Output: a document describing how those requirements are met by MES and how to demonstrate that to the customer.

## Phase 2 - Generate Master Data For The Requirements

Goal:

- Given a specific requirement from the customer's list, build a tool that generates the Master Data needed to create the corresponding MES objects.

Context:

- Master Data is a mechanism for creating MES objects in bulk.
- `MasterData_CookieFactory .zip` is the example provided for this.
- Once generated, the Master Data can be imported into MES to create objects such as Materials and Resources required for the demo.

Expected outcome:

- Input: an Excel file with a list of requirements.
- Output: for applicable requirements, Master Data that creates the MES objects needed to demonstrate MES.

## What Critical Manufacturing Said They Will Provide

- A working MES environment: `https://lgp2026.apps.rhosdmz.criticalmes.dev/`
- Access to an MCP Server that can answer questions about the MES and has access to all documentation
- A Bedrock API key for accessing LLMs

## Important Interpretation

This message should override older planning documents where they still describe the project as taking broad heterogeneous or unstructured documentation as input. The current scope is Excel-requirements-driven.
