import { _test_private } from "@pages/index";
import { z } from "zod";

describe('hello world', ()=>{
    test('hello world', ()=> {
        expect('hello world').toStrictEqual('hello world');
    })
})

describe('front-end form valid submissions', ()=>{
    type FEMovieForm = z.input<typeof _test_private.MovieZormForm>;
    const FormSchema = _test_private.MovieZormForm;
    const ImageUpload = _test_private.MovieImageFileUpload;
    type FEImageUpload = z.input<typeof ImageUpload>;
    test('primary title only', () => {
        expect(()=>{
            const submit: FEMovieForm = {
                primaryTitle: "hello world"
            };
            const v = FormSchema.parse(submit);
            expect(v.primaryTitle).toStrictEqual("hello world");
            expect(v.originalTitle).toStrictEqual("hello world");
            expect(v.genre).toHaveLength(0);
            expect(v.endDate).toBeUndefined();
            expect(v.releaseDate).toBeUndefined();
            expect(v.brief).toBeUndefined();
            expect(v.imageNamespace).toStrictEqual("movies");
        }).not.toThrow();
    });

    test('optional image upload', ()=> {
        expect(()=> {
            const submit: FEImageUpload = {
            }
            const v = ImageUpload.parse(submit);
            expect(v.imageUpload).toBeUndefined();
            expect(v.imageNamespace).toStrictEqual("movies");
        }).not.toThrow();
    })

})
