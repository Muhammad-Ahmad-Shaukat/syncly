import { DataTypes } from "sequelize";
import bcrypt from "bcrypt";
import { sequelize } from "../db/db.js";

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [3, 50],
            isAlphanumeric: true
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
            len: [5, 100]
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [8, 100]
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    tierType: {
        type: DataTypes.ENUM('basic', 'pro', 'extreme'),
        allowNull: false,
        defaultValue: 'basic'
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true
    },
    password_reset_token: {
        type: DataTypes.STRING,
        allowNull: true
    },
    password_reset_expires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    login_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    lock_until: {
        type: DataTypes.DATE,
        allowNull: true
    },
    google_sub: {
        type: DataTypes.STRING(128),
        allowNull: true,
        unique: true
    },
    stripe_customer_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    stripe_subscription_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    subscription_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'none'
    },
    expo_push_token: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(12);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(12);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.incrementLoginAttempts = async function() {
    this.login_attempts += 1;
    if (this.login_attempts >= 5) {
        this.lock_until = new Date(Date.now() + 30 * 60 * 1000);
    }
    await this.save();
};

User.prototype.resetLoginAttempts = async function() {
    this.login_attempts = 0;
    this.lock_until = null;
    await this.save();
};

User.prototype.isLocked = function() {
    return this.lock_until && this.lock_until > new Date();
};

User.prototype.updateLastLogin = async function() {
    this.last_login = new Date();
    await this.save();
};

User.findByEmail = async function(email) {
    return await this.findOne({ where: { email } });
};

User.findActiveUsers = async function() {
    return await this.findAll({ where: { is_active: true } });
};

User.findByTier = async function(tierType) {
    return await this.findAll({ where: { tierType } });
};

export default User;