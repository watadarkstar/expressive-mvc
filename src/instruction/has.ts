import { issues } from '../issues';
import { Model } from '../model';
import { InstanceOf } from '../types';
import { apply } from './apply';
import { Parent } from './use';

export const Oops = issues({
  Required: (expects, child) => 
    `New ${child} created standalone but requires parent of type ${expects}. Did you remember to create via use(${child})?`,

  Unexpected: (expects, child, got) =>
    `New ${child} created as child of ${got}, but must be instanceof ${expects}.`,
})

/**
 * Fetches and assigns the controller which spawned this host.
 * When parent assigns an instance via `use()` directive, it
 * will be made available to child upon this request.
 *
 * @param Expects - Type of controller compatible with this class. 
 * @param required - Throw if controller is created independantly.
 */
function has <T extends typeof Model> (Expects: T, required: false): InstanceOf<T> | undefined;
function has <T extends typeof Model> (Expects: T, required?: true): InstanceOf<T>;

function has<T extends typeof Model>(
   Expects: T, required?: boolean){

   return apply(
     function parent(){
       const child = this.subject;
       const value = Parent.get(child) as InstanceOf<T>;
       const expected = Expects.name;

       if(!value){
         if(required !== false)
           throw Oops.Required(expected, child);
       }
       else if(!(value instanceof Expects))
         throw Oops.Unexpected(expected, child, value);

       return { value };
     }
   );
 }

 export { has }