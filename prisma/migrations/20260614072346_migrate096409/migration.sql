-- DropIndex
DROP INDEX "Store_deletedAt_idx";

-- DropIndex
DROP INDEX "Store_purgeAt_idx";

-- RenameIndex
ALTER INDEX "FieldSale_staffId_storeId_activityDate_callValueTier_birthMonth" RENAME TO "FieldSale_staffId_storeId_activityDate_callValueTier_birthM_idx";

-- RenameIndex
ALTER INDEX "Visit_staffId_storeId_visitDate_callValueTier_birthMonth_annive" RENAME TO "Visit_staffId_storeId_visitDate_callValueTier_birthMonth_an_idx";
