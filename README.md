# backend

# Setup

1. Install PostgreSQL, Redis, nginx and RabbitMQ (optional).

2. Copy .env.example to .env and populate the configuration. If you've decided to not install RabbitMQ,
   please remove the `webhook` service from `SERVICES` variable.

3. First, generate the Prisma client and build the project, as it's necessary for the next steps:

    ```sh
    yarn prisma generate
    yarn build
    ```

    Note for unfamiliar with Prisma: Since the ORM uses generated source code, you must run `yarn prisma generate` every time the schema changes.

    So if you're getting build errors related to it, simply run the above and try again.

    Please refer to [Prisma documentation](https://www.prisma.io/docs/concepts) for more information.

4. Run database migrations:

    ```sh
    yarn prisma:migrate
    ```

    Now you can start the project in watch mode:

    ```sh
    yarn dev
    ```

# Documentation

Swagger UI is available on the [/docs](http://localhost:4000/docs) page

# Development notes

We have some specific rules to ensure our code and API design and implementation is clean, consistent and scalable.

**Please follow these rules when developing new features or fixing bugs, as they're strictly enforced during code review
and will delay merging your PR if not followed properly.**

### Do not wrap request handlers in try-catch blocks

The error handling is done by the framework, so wrapping everything in try-catch blocks breaks things
like Sentry error reporting, add extra indentation and makes the code harder to read.

### Use APIErrors for all errors

The API must return errors in a specific format for consistency reasons, so use `APIError` definitions
and `return reply.sendError()` if you need to return an error.

### Keep successful responses clean and consistent

The API should not return any unnecessary data in successful responses.

Simply use `reply.send()` for most responses and `reply.status(201).send()` for requests that create a resource.

Do not use code like `reply.status(200).send({ message: 'User has been created' })` as it's ugly,
not needed by the client at all, has minor serialization overhead and is inconsistent with our conventions.

### Keep database schema changes backwards-compatible

Due to nature of our clustered system, it's possible that two different versions of the service will be running and the
database schema must be compatible with both.

Our software is designed in a way that allows us to deploy new versions of the service with zero downtime.

For example in case when a new deployment fails health checks, we must ensure that the old version of the service can
still work with the database.

This means that you can't simply remove a column or table, change it's type or add a new one without a default, as it
will break the old version of the service, at least until it's fully rolled out.

Therefore we have to delay deletion of a column or table until we're sure it's not actually being used anymore.

### Do not store any local state in services

The requests are handled by different instances of the service, so we can't have any state stored locally in memory,
as another instance won't have access to it.

Our solution to this problem is to use [Redis](https://redis.io/) for storing state. It's a fast in-memory database that
can be used for caching and storing temporary data.

The service containers also do not have any kind of persistent local filesystem, so anything involving large files, for
example file uploads must be stored in an external storage system like S3. At time of writing we use
[Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) for storing public files (regional distribution and free
egress makes it perfect for a public CDN) and [Vultr Object Storage](https://www.vultr.com/products/object-storage/)
for files that are internal and not exposed on any kind of public URL.

For handling scheduled tasks, we use [BullMQ](https://bullmq.io), which is a Redis-based job queue.

### Use dependency injection

### Use distributed IDs for all entities in system

todo - not applicable to Mongo?

Use `SnowflakeService` to generate IDs. Do not use `@PrimaryGeneratedColumn`.

The IDs have one useful property you can use - they internally encode a timestamp, so if you need to get creation
date of an entity or time-sort things, you don't have to store the date separately.

# Cheat sheet

### Fix migration checksums

If you get an error like this while creating a migration or doing something else with Prisma:

```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "fyp-fans-test", schema "public" at "localhost:5432"

The migration `20231227023238_convert_poll_data` was modified after it was applied.
✔ We need to reset the "public" schema at "localhost:5432"
Do you want to continue? All data will be lost. … no

```

We added an utility to our CLI to fix this issue. Simply run:

```sh
yarn build
yarn cli syncPrismaChecksums
```
