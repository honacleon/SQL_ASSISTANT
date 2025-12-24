// backend/src/services/organization.service.ts
import { supabase } from '../config/auth.config';
import { v4 as uuidv4 } from 'uuid';

export interface Organization {
    id: string;
    name: string;
    created_at: string;
}

export const createOrganization = async (name: string, ownerUserId: string) => {
    const orgId = uuidv4();
    // Insert organization
    const { data: org, error: orgErr } = await supabase.from('organizations').insert({ id: orgId, name }).single();
    if (orgErr) throw orgErr;
    // Link owner as admin in organization_members
    const { error: memberErr } = await supabase.from('organization_members').insert({ user_id: ownerUserId, org_id: orgId, role: 'owner' });
    if (memberErr) throw memberErr;
    // Update user_profiles with org_id
    const { error: profileErr } = await supabase.from('user_profiles').upsert({ id: ownerUserId, org_id: orgId, role: 'admin' });
    if (profileErr) throw profileErr;
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
};
