import { Component, OnInit, Input, Output, EventEmitter, AfterContentInit,AfterViewInit, ContentChild, ElementRef, ViewChild } from '@angular/core';
import { PostType } from 'src/app/model/post-type';
import { ProviderService } from 'src/app/service/provider-service/provider.service';
import { API_TYPE } from 'src/app/model/apiType';
import { FormGroup, FormBuilder, FormControl, Validators} from '@angular/forms'
import { Post } from '../../../../model/post';
import { ViewEncapsulation } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {MatSnackBar} from '@angular/material/snack-bar';
import { ConfigService } from 'src/app/service/config/config-service';
import {User} from "../../../../model/user";
import {environment} from "../../../../../environments/environment";
import {PostResponse} from "../../../../model/post-response";
import {NgxPubSubService} from "@pscoped/ngx-pub-sub";


@Component({
  selector: 'app-create-post',
  templateUrl: './create-post.component.html',
  styleUrls: ['./create-post.component.css']

})
export class CreatePostComponent implements OnInit ,AfterContentInit,AfterViewInit {
  isCreated = false;
  users: Array<any>;
  isShow = true;
  imageSrc: string;
  postform: FormGroup;
  @Input("pageType") pageType: PostType = PostType.HOMEPAGE_POSTS
  @Input('editFlag') isEditPage: Boolean;
  @ViewChild ("closeModal",{static:false}) closeModall :ElementRef
  isSearchPage: Boolean;
  errorMessage: string;
  uploadForm: FormGroup;
  private readonly apiEndpoint: String = environment.apiEndpoint
  user: User = JSON.parse(localStorage.getItem('active_user'));
  imageUrl: string | ArrayBuffer;

  constructor(private config:ConfigService,private snackBar:MatSnackBar,private http: HttpClient, private formBuilder: FormBuilder, private providerService: ProviderService,private pubSubService: NgxPubSubService) {
    this.initForm();
  }


  ngOnInit() {
    let path = `${this.user._id}/followers`
    this.isSearchPage = this.pageType === PostType.SEARCH_POSTS;
    this.providerService.get(API_TYPE.USER, path, '').subscribe((Listusers: Array<any>) => {

      this.users = Listusers;

      for (var i = 0; i < this.users.length; i++) {
        this.users[i].checked = false;
      }
    }, err => {
      this.errorMessage = err.responseMessage;
    })
  }

  initForm(){
    this.postform = this.formBuilder.group({
      content:['',[Validators.required, Validators.minLength(2), Validators.maxLength(700)]],
      avatar: [null],
      minAge: ['',[ Validators.min(0),this.minAge.bind(this)]],
      maxAge: ['',[ Validators.min(0),this.maxAge.bind(this)]],
      notifyFollowers: ['']
    })
  }

  submit() {
    let audienceFollowers = [];

    for (var i = 0; i < this.users.length; i++) {
      if (this.users[i].checked == true) {
        audienceFollowers.push({ user: this.users[i].userId._id })
      }
      else if (this.users[i].checked == false) {

      }
    }

    let notifyfoll = this.postform.get('notifyFollowers').value!=''?this.postform.get('notifyFollowers').value:'false'; //TODO: notify null has been sent to server
    let ageGroupTarget =  { min: this.postform.get('minAge').value, max: this.postform.get('maxAge').value }
    var formData: any = new FormData();
    formData.append("content", this.postform.get('content').value);
    if(this.postform.get('avatar').value){
      formData.append("imageLink", this.postform.get('avatar').value);
    }
    formData.append("targetFollowers", JSON.stringify(audienceFollowers));

    formData.append('ageGroupTarget', JSON.stringify(ageGroupTarget)?JSON.stringify(ageGroupTarget):'');
    formData.append("notifyFollowers",new String(notifyfoll))
    console.log("notifyFollowers",new String(this.postform.get('notifyFollowers').value));

    const httpOptions = {
      headers:  this.config.getHeadersMultipart()
    }


    // Publishes an event on the homepage
    this.onPostCreatedEvent(formData)

    console.log(formData);

    this.http.post(`${this.apiEndpoint}/posts`, formData,httpOptions).subscribe((data: Post) => {
      this.isCreated = true
      console.log(data)
     // this.snackBar.open('post created successfully','Ok')
    //  this.loadNewData();
    }, error => {
       console.log(`${error}`)
       this.snackBar.open('An Error Occurred. Please try again','Ok')
       this.errorMessage = error.responseMessage;
       this.providerService.onTokenExpired(error.errorMessage,error.status)

    });

    this.initForm();
    this.imageUrl=null;
    this.closeModall.nativeElement.click();
  }

  uploadFile(event) {
    const file = (event.target as HTMLInputElement).files[0];
    this.postform.patchValue({
      avatar: file
    });

    var mimeType = file.type;
    if (mimeType.match(/image\/*/) == null) {
      this.snackBar.open('only images are allowed', 'Ok')
      return;
    }

    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (_event) => {
      this.imageUrl = reader.result;
    }
  }


  toggleDisplay() {
    this.isShow = !this.isShow;
  }

 @Output("loadNewData") someEvent = new EventEmitter<string>();


  onPostCreatedEvent(formData: FormData){
      // @ts-ignore
    let post  = new PostResponse('',formData.get('imageLink'),this.user._id,new Date(),true,this.user.profilePicture,this.user.username,[],formData.get('content').value,[])
    this.pubSubService.publishEvent('onPostCreatedEvent',post)
  }


  loadNewData(): void {
    this.someEvent.next();
  }

  ngAfterContentInit(): void {
    console.log("ng on after Content Init : " + this.closeModall);
  }
  ngAfterViewInit():void{
    console.log("ng on after Content Init : " + this.closeModall);

  }

  maxAge(max: FormControl): { [s: string]: boolean } {
    if (this.postform) {
      let min = this.postform.get('minAge');
      let control = this.postform.get('maxAge');

      if (control != null)
        if (control.value > 110)
          return { invalidMaxAge: true };


      if (control != null && min != null) {
        if (control.value < min.value) {
          min.setErrors({ invalidMinAge: true })
          return { invalidMaxAge: true };
        }
      }
      min.setErrors(null)

      return null;

    }

  }

  minAge(min: FormControl): { [s: string]: boolean } {
    if (this.postform) {
      let max = this.postform.get('maxAge');
      let control = this.postform.get('minAge');


      if (control != null && max != null) {
        if (control.value > max.value ) {
          max.setErrors({ invalidMaxAge: true })
          return { invalidMinAge: true };
        }
      }
      if (max.value < 120)
        max.setErrors(null)

      return null;

    }

}

}