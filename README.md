# RLS Guard Dog: Classroom & Progress Management

RLS Guard Dog is a full-stack web application designed to manage classroom and student progress data with a strong focus on security. It leverages Supabase's powerful Row-Level Security (RLS) to create a fine-grained, role-based access control system for a multi-user school environment. It leverages Supabase edge functions to provide serverless logic.

---

## Tech Stack

This project is built with a modern, serverless-first technology stack:

* **Framework:** [Next.js](https://nextjs.org/) (with App Router)
* **Backend & Database:** [Supabase](https://supabase.com/)
    * **Auth:** Handles user authentication (OAuth & Email/Password).
    * **PostgreSQL DB:** The primary database for all relational data.
    * **Row-Level Security (RLS):** The core security mechanism.
    * **Edge Functions:** Written in Typescript and ran on the Deno runtime, for serverless, on-demand backend logic.
* **Secondary Database:** [MongoDB](https://www.mongodb.com/) for storing aggregated data like class averages.
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)

---

## Core Features & Functionalities

The application implements a robust set of features centered around a secure, multi-tenant architecture.

* **Role-Based Access Control:** The system defines three distinct user roles with specific permissions:
    * **Student:** Can only view their own academic progress.
    * **Teacher:** Can view their assigned classrooms, see all students within those classes, and manage their progress records.
    * **Head Teacher:** Has a full overview of all classrooms, teachers, and students within their assigned school.

* **Secure Data Management:**
    * Comprehensive Row-Level Security policies on the PostgreSQL database ensure that users can only ever access the data they are explicitly permitted to see.
    * Teachers can perform full CRUD (Create, Read, Update, Delete) operations on the progress records of students in their own classrooms.

* **Dual Authentication Methods:**
    * **OAuth (GitHub):** Used for staff members like Head Teachers, providing a secure and convenient login method.
    * **Email & Password:** Used for Teachers and Students, allowing for easy creation of dummy accounts for development and testing.

* **Serverless Edge Function:**
    * An on-demand Supabase Edge Function connects to the primary database, calculates the average score for every classroom, and saves the results to a MongoDB collection.

* **MongoDB Integration:**
    * A secondary MongoDB database is used to store and serve the calculated class averages, demonstrating a hybrid data architecture where relational and NoSQL databases are used for their respective strengths.
