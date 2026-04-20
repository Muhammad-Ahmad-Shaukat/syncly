import Joi from 'joi';

const userValidation = {
    createUser: (req, res, next) => {
        const schema = Joi.object({
            username: Joi.string().alphanum().min(3).max(50).required(),
            email: Joi.string().email().required(),
            password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).required()
                .messages({
                    'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character'
                }),
            tierType: Joi.string().valid('basic', 'pro', 'extreme').default('basic')
        });
        
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        next();
    },

    updateUser: (req, res, next) => {
        const schema = Joi.object({
            username: Joi.string().alphanum().min(3).max(50),
            email: Joi.string().email(),
            tierType: Joi.string().valid('basic', 'pro', 'extreme'),
            is_active: Joi.boolean()
        });
        
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        next();
    },

    changePassword: (req, res, next) => {
        const schema = Joi.object({
            oldPassword: Joi.string().required(),
            newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).required()
        });
        
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        next();
    },

    idParam: (req, res, next) => {
        const schema = Joi.object({
            id: Joi.number().integer().positive().required()
        });
        
        const { error } = schema.validate(req.params);
        if (error) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        next();
    },

    login: (req, res, next) => {
        const schema = Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().required(),
            store_url: Joi.string().max(2048).optional()
        });
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        next();
    }
};

export default userValidation;