import User from "../../modals/users.js";
import { Op } from "sequelize";

export const userService = {
    async createUser(userData) {
        try {
            const existingUser = await User.findOne({ where: { email: userData.email } });
            if (existingUser) {
                throw new Error('Email already exists');
            }
            
            const user = await User.create(userData);
            const { password, ...userWithoutPassword } = user.toJSON();
            return userWithoutPassword;
        } catch (error) {
            throw error;
        }
    },

    async authenticate(email, password) {
        const normalizedEmail = typeof email === "string" ? email.trim() : "";
        const plainPassword = password == null ? "" : String(password);

        const user = await User.findOne({ where: { email: normalizedEmail } });
        if (!user) {
            console.warn("[userService.authenticate] no user for email (trimmed, exact match):", JSON.stringify(normalizedEmail));
            throw new Error('Invalid email or password');
        }
        if (!user.is_active) {
            console.warn("[userService.authenticate] inactive user id=", user.id);
            throw new Error('Account is deactivated');
        }
        if (user.isLocked()) {
            console.warn("[userService.authenticate] locked user id=", user.id);
            throw new Error('Account temporarily locked. Try again later.');
        }
        const valid = await user.comparePassword(plainPassword);
        if (!valid) {
            console.warn("[userService.authenticate] password mismatch user id=", user.id, "submittedPwdLen=", plainPassword.length);
            await user.incrementLoginAttempts();
            throw new Error('Invalid email or password');
        }
        await user.resetLoginAttempts();
        await user.updateLastLogin();
        const { password: _pw, ...userWithoutPassword } = user.toJSON();
        return userWithoutPassword;
    },

    async getAllUsers(page = 1, limit = 10, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            const where = {};
            
            if (filters.is_active !== undefined) where.is_active = filters.is_active;
            if (filters.tierType) where.tierType = filters.tierType;
            if (filters.search) {
                where[Op.or] = [
                    { username: { [Op.like]: `%${filters.search}%` } },
                    { email: { [Op.like]: `%${filters.search}%` } }
                ];
            }
            
            const { count, rows } = await User.findAndCountAll({
                where,
                attributes: { exclude: ['password', 'password_reset_token', 'password_reset_expires'] },
                limit,
                offset,
                order: [['created_at', 'DESC']]
            });
            
            return {
                total: count,
                page,
                totalPages: Math.ceil(count / limit),
                users: rows
            };
        } catch (error) {
            throw error;
        }
    },

    async getUserById(id) {
        try {
            const user = await User.findByPk(id, {
                attributes: { exclude: ['password', 'password_reset_token', 'password_reset_expires'] }
            });
            if (!user) throw new Error('User not found');
            return user;
        } catch (error) {
            throw error;
        }
    },

    async updateUser(id, updateData) {
        try {
            const user = await User.findByPk(id);
            if (!user) throw new Error('User not found');
            
            delete updateData.password_reset_token;
            delete updateData.password_reset_expires;
            delete updateData.login_attempts;
            delete updateData.lock_until;
            
            await user.update(updateData);
            const { password, ...userWithoutPassword } = user.toJSON();
            return userWithoutPassword;
        } catch (error) {
            throw error;
        }
    },

    async deleteUser(id, permanent = false) {
        try {
            const user = await User.findByPk(id);
            if (!user) throw new Error('User not found');
            
            if (permanent) {
                await user.destroy();
                return { message: 'User permanently deleted' };
            } else {
                await user.update({ is_active: false });
                return { message: 'User deactivated successfully' };
            }
        } catch (error) {
            throw error;
        }
    },

    async restoreUser(id) {
        try {
            const user = await User.findByPk(id);
            if (!user) throw new Error('User not found');
            await user.update({ is_active: true });
            return { message: 'User restored successfully' };
        } catch (error) {
            throw error;
        }
    },

    async changePassword(id, oldPassword, newPassword) {
        try {
            const user = await User.findByPk(id);
            if (!user) throw new Error('User not found');
            
            const isValid = await user.comparePassword(oldPassword);
            if (!isValid) throw new Error('Current password is incorrect');
            
            user.password = newPassword;
            await user.save();
            return { message: 'Password changed successfully' };
        } catch (error) {
            throw error;
        }
    },

    async updateTier(id, tierType) {
        try {
            const user = await User.findByPk(id);
            if (!user) throw new Error('User not found');
            
            await user.update({ tierType });
            const { password, ...userWithoutPassword } = user.toJSON();
            return userWithoutPassword;
        } catch (error) {
            throw error;
        }
    },

    async getUserStats() {
        try {
            const total = await User.count();
            const active = await User.count({ where: { is_active: true } });
            const inactive = await User.count({ where: { is_active: false } });
            const tierStats = {
                basic: await User.count({ where: { tierType: 'basic' } }),
                pro: await User.count({ where: { tierType: 'pro' } }),
                extreme: await User.count({ where: { tierType: 'extreme' } })
            };
            
            return { total, active, inactive, tierStats };
        } catch (error) {
            throw error;
        }
    }
};