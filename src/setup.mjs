export function setup(ctx)
{
	const relic_chance_perc = 0.025
	const relic_quant_perc = 0.025
	const rare_chance_perc = 0.01
	let mod_relic_chance = 1.0
	let mod_relic_quantity = 1.0
	let mod_rare_chance = 1.0

	// This is required to be intialized at the very beginning for compatibility sake with Pokeworld.
	let special_pets = {
		relic_chance: 	 	{pets: ["genericmon:crow", "genericmon:bear"], num_unlocked: 0},
		relic_quantity:		{pets: ["genericmon:giraffe", "genericmon:hippo"], num_unlocked: 0},
		rare_chance: 	 	{pets: ["genericmon:shark", "genericmon:turtle"], num_unlocked: 0}
	}

	function reset(){
		special_pets = {
			relic_chance: 	 	{pets: ["genericmon:crow", "genericmon:bear"], num_unlocked: 0},
			relic_quantity:		{pets: ["genericmon:giraffe", "genericmon:hippo"], num_unlocked: 0},
			rare_chance: 	 	{pets: ["genericmon:shark", "genericmon:turtle"], num_unlocked: 0}
		}
	}

	function checkPets(){
		reset()
		for (const key of Object.keys(special_pets)){
			special_pets[key].pets.forEach((id)=>{
				let pet = game.pets.getObjectByID(id)
				if (game.petManager.isPetUnlocked(pet))
					{
						special_pets[key].num_unlocked += 1
					}
				})
			}
			mod_relic_chance = 1.0 + (special_pets.relic_chance.num_unlocked * relic_chance_perc)
			mod_relic_quantity = 1.0 + (special_pets.relic_quantity.num_unlocked * relic_quant_perc)
			mod_rare_chance = 1.0 + (special_pets.rare_chance.num_unlocked * rare_chance_perc)
		}

	// On load tally special pets
	ctx.onCharacterLoaded(async (ctx) => {
		checkPets()
		// unlockAll()
		
	});


	ctx.patch(PetManager, "unlockPet").after(function(o, pet) {
		if (pet === undefined){
				return;
			}

		if 	(special_pets.relic_chance.pets.includes(pet.id) ||
		 	(special_pets.relic_quantity.pets.includes(pet.id)) ||
		  	(special_pets.rare_chance.pets.includes(pet.id)))
		{
			checkPets()
		}
	});

	ctx.patch(Skill, "rollForRareDrops").replace(function(o, level, rewards, action) {
		this.rareDrops.forEach((drop)=>{
			let chance_copy = JSON.parse(JSON.stringify(drop.chance))
			let quantity_copy = JSON.parse(JSON.stringify(drop.quantity))

			if (drop.item.localID.includes('Lesser_Relic')) {
				chance_copy.chance *= mod_relic_chance
				quantity_copy = Math.round(quantity_copy.quantity * mod_relic_quantity)
			} else if (chance_copy.type === "Fixed") {
				chance_copy.chance *= mod_rare_chance
			} else {
				chance_copy.scalingFactor *= mod_rare_chance
			}

            let realmToCheck = game.defaultRealm;
            if (action !== undefined)
                realmToCheck = action.realm;
            if (this.game.checkRequirements(drop.requirements) && this.isCorrectGamemodeForRareDrop(drop) && this.isCorrectRealmForRareDrop(drop, realmToCheck) && ((drop.item.localID.includes('Birthday_Present') && this.game.settings.toggleBirthdayEvent) || !drop.item.localID.includes('Birthday_Present')) && rollForOffItem(this.getRareDropChance(level, chance_copy))) {
                if (drop.altItem !== undefined && this.game.modifiers.allowSignetDrops) {
                    rewards.addItem(drop.altItem, quantity_copy);
                } else {
                    rewards.addItem(drop.item, quantity_copy);
                }
            }
        })
	});
	
	/*
	************************
	** Dev Test Functions **
	************************
	*/

	// //Test function for skill pets
	// ctx.patch(PetManager, 'rollForSkillPet').after(function(o, pet, actionInterval, forceSkill) {
	// 	if (this.unlocked.has(pet))
	// 		return;
	// 	if (forceSkill === undefined)
	// 		forceSkill = pet.skill;
	// 	if (forceSkill === undefined)
	// 		return;
		
	// 	const virtualLevel = forceSkill.virtualLevel;
	// 	let chanceForPet = 0;
		
	// 	if (pet.id.includes("genericmon"))
    //         chanceForPet = 2
        
    //         if (rollPercentage(chanceForPet)) {
    //             this.unlockPet(pet);
    //         }
	// });

	// //Test unlock all
	// function unlockAll(){
	// 	game.pets.allObjects.forEach((pet)=> {
	// 		if (pet._namespace.name === "genericmon") {
	// 			game.petManager.unlockPetByID(pet.id)
	// 		}
	// 	})
	// }

};