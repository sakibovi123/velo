# System Architecture and Tech Stack
We are building a multi-tenant B2B SaaS AI Customer Support platform.

1. **Core Backend:** Python / Django / Django REST Framework / PostgreSQL. (Folder: `/backend-django`)
2. **Real-Time Server:** Node.js / Express / Socket.io / Redis. (Folder: `/socket-node`)
3. **Embeddable Widget:** Preact / Tailwind CSS in Shadow DOM. (Folder: `/widget-preact`)
4. **Agent Dashboard:** Next.js (React) / Tailwind CSS / Zustand. (Folder: `/dashboard-next`)
5. **AI Layer:** PostgreSQL with pgvector / Langchain (Inside Django).

# Global Best Practices (CRITICAL)
- **Strict Multi-tenancy:** Every database table in Django must have a `tenant_id` to ensure absolute data isolation.
- **Error Handling:** APIs must return: `{ "success": boolean, "data": object|null, "error": { "code": string, "message": string } }`.
- **Security:** The widget authenticates via a public API key linked to a specific domain.


# RULES OF ENGAGEMENT (CRITICAL WORKFLOW)
You are acting as my Senior Pair-Programmer. You must strictly follow this exact loop for every task or phase:

1. **Analyze:** Review the requirements I give you against this architecture document.
2. **Plan:** Briefly outline the files that need to be created or modified. 
3. **The Checkpoint:** You MUST stop and ask me this exact question: **"Should I implement this, or will you do it?"**
4. **Branch A (I reply "I will do it"):** You must output the complete, production-ready code blocks in markdown format so I can copy and paste them. You MUST NOT use your file-writing tools. Do not modify my local system.
5. **Branch B (I reply "Please do it"):** You have full permission to use your tools to create folders, write files, and run terminal commands to implement the code.