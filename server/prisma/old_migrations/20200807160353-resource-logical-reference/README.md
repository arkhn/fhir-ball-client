# Migration `20200807160353-resource-logical-reference`

This migration has been generated by simonvadee at 8/7/2020, 6:03:53 PM.
You can check out the [state of the schema](./schema.prisma) after the migration.

## Database Steps

```sql
ALTER TABLE "pyrog"."Resource" ADD COLUMN "logicalReference" text  NOT NULL DEFAULT E'';
```

## Changes

```diff
diff --git schema.prisma schema.prisma
migration 20200806164907-input-groups..20200807160353-resource-logical-reference
--- datamodel.dml
+++ datamodel.dml
@@ -1,11 +1,12 @@
 generator client {
-  provider = "prisma-client-js"
+  provider        = "prisma-client-js"
+  previewFeatures = ["transactionApi"]
 }
 datasource db {
   provider = "postgresql"
-  url = "***"
+  url = "***"
 }
 // One per software (Chimio, Crossway, etc)
 model Template {
@@ -54,8 +55,9 @@
 }
 model Resource {
   id               String      @default(cuid()) @id
+  logicalReference String      @default("")
   label            String?
   primaryKeyTable  String?
   primaryKeyColumn String?
   // filters on db to avoid processing all the DB
```


