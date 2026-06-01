// Mirror of the EnsureCanManageSubscription middleware (PHP). Centralised here
// so both the layout chrome (sidebar/dropdown links) and per-page UI (banners,
// CTAs) can ask the same question without keeping two definitions in sync.
//
// Rule: agency managers (admin) and platform staff (super_admin) always pass.
// Realtors only pass when their agency is on the Solo plan (`starter`), where
// they are effectively their own manager.
export const canManageSubscription = (user) => {
    if (!user) return false;
    if (user.is_super_admin || user.is_admin) return true;
    return user.agency?.subscription_plan === 'starter';
};
