
import { Schema, model, type InferSchemaType } from 'mongoose';

const teacherSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    specialization: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    experience: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Experience must be an integer'
      }
    }
  },
  {
    timestamps: true
  }
);

teacherSchema.index({ email: 1 }, { unique: true });

export type TeacherDocument = InferSchemaType<typeof teacherSchema>;

export const Teacher = model('Teacher', teacherSchema);
