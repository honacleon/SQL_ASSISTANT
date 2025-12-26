// backend/src/services/organization.service.ts
import { supabase } from '../config/auth.config';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';

export interface Organization {
    id: string;
    name: string;
    created_at: string;
}

/**
 * Get user's organization from user_profiles or organization_members
 */
export const getUserOrganization = async (userId: string): Promise<Organization | null> => {
    logger.debug('getUserOrganization called', { userId });

    // First check user_profiles
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('org_id')
        .eq('id', userId)
        .maybeSingle();

    logger.debug('user_profiles query result', { profile, profileError: profileError?.message });

    if (profile?.org_id) {
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profile.org_id)
            .maybeSingle();

        logger.debug('organizations query from profile', { org, orgError: orgError?.message });
        if (org) return org as Organization;
    }

    // Then check organization_members
    const { data: membership, error: memberError } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

    logger.debug('organization_members query result', { membership, memberError: memberError?.message });

    if (membership?.org_id) {
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', membership.org_id)
            .maybeSingle();

        logger.debug('organizations query from membership', { org, orgError: orgError?.message });
        if (org) return org as Organization;
    }

    logger.debug('No organization found for user', { userId });
    return null;
};

/**
 * Update user's app_metadata with org_id (requires service role key)
 */
export const updateUserAppMetadata = async (userId: string, orgId: string): Promise<void> => {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
        app_metadata: { org_id: orgId }
    });

    if (error) {
        logger.error('Failed to update user app_metadata', { userId, orgId, error: error.message });
        throw error;
    }

    logger.info('Updated user app_metadata with org_id', { userId, orgId });
};

/**
 * Create organization and associate user
 */
export const createOrganization = async (name: string, ownerUserId: string) => {
    const orgId = uuidv4();

    // Insert organization
    const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .insert({ id: orgId, name })
        .select()
        .single();

    if (orgErr) throw orgErr;

    // Link owner as admin in organization_members
    const { error: memberErr } = await supabase
        .from('organization_members')
        .insert({ user_id: ownerUserId, org_id: orgId, role: 'owner' });

    if (memberErr) throw memberErr;

    // Update user_profiles with org_id
    const { error: profileErr } = await supabase
        .from('user_profiles')
        .upsert({ id: ownerUserId, org_id: orgId, role: 'admin' });

    if (profileErr) throw profileErr;

    // Update user's app_metadata so org_id is in the JWT
    try {
        await updateUserAppMetadata(ownerUserId, orgId);
    } catch (e) {
        logger.warn('Could not update app_metadata, user may need to re-login', { error: e });
    }

    return org;
};

export const getOrganization = async (orgId: string) => {
    const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).single();
    if (error) throw error;
    return data as Organization;
};

export const listMembers = async (orgId: string) => {
    const { data, error } = await supabase.from('organization_members').select('user_id, role').eq('org_id', orgId);
    if (error) throw error;
    return data;
};

export const inviteMember = async (orgId: string, userId: string, role: string = 'member') => {
    const { error } = await supabase.from('organization_members').insert({ user_id: userId, org_id: orgId, role });
    if (error) throw error;
    // Also ensure user_profiles has org_id
    await supabase.from('user_profiles').upsert({ id: userId, org_id: orgId, role });

    // Update app_metadata
    try {
        await updateUserAppMetadata(userId, orgId);
    } catch (e) {
        logger.warn('Could not update app_metadata for invited user', { error: e });
    }
};

